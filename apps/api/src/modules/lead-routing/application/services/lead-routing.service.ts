import { forwardRef, Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../../../platform/database/prisma.service.js";
import { AuditService } from "../../../audit/audit.service.js";
import { RealtimeService } from "../../../realtime/realtime.service.js";
import { AuditAction, AvailabilityExceptionStatus, AvailabilityExceptionType, LeadQueueReason, LeadQueueStatus, Prisma, UserStatus, WorkspaceMemberStatus } from "@prisma/client";
import { LeadRoutingStatus } from "../constants/lead-routing.constants.js";
import type { Db } from "../types/routing.types.js";
import { LeadQueueService } from "./lead-queue.service.js";
import { LeadRoutingSupportService } from "./lead-routing-support.service.js";

@Injectable()
export class LeadRoutingService {
    private readonly logger = new Logger(LeadRoutingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly support: LeadRoutingSupportService,
        @Inject(forwardRef(() => LeadQueueService))
        private readonly queue: LeadQueueService,
        @Optional() private readonly realtime?: RealtimeService,
    ) { }

    async routeNewConversation(conversationId: string, workspaceId: string) {
        const configuredShiftCount = await this.prisma.workShift.count({
          where: { workspaceId },
        });
        if (configuredShiftCount === 0) return { status: LeadRoutingStatus.LEGACY };
    
        const result = await this.prisma.$transaction(
          async (tx) => {
            const conversation = await tx.conversation.findFirst({
              where: { id: conversationId, workspaceId },
            });
            if (
              !conversation ||
              conversation.status !== 'OPEN' ||
              conversation.assignedMemberId
            )
              return { status: LeadRoutingStatus.SKIPPED };
            const now = new Date();
            const candidates = await this.support.getCandidates(tx, workspaceId, now);
            const counts = await this.support.getOpenCounts(
              tx,
              workspaceId,
              candidates.map((candidate) => candidate.workspaceMemberId),
            );
            const sorted = candidates
              .filter(
                (candidate) =>
                  (counts.get(candidate.workspaceMemberId) ?? 0) <
                  candidate.capacity,
              )
              .sort((a, b) => {
                const ratio =
                  (counts.get(a.workspaceMemberId) ?? 0) / a.capacity -
                  (counts.get(b.workspaceMemberId) ?? 0) / b.capacity;
                if (ratio) return ratio;
                if (!a.lastAssignedAt && b.lastAssignedAt) return -1;
                if (a.lastAssignedAt && !b.lastAssignedAt) return 1;
                return (
                  (a.lastAssignedAt?.getTime() ?? 0) -
                  (b.lastAssignedAt?.getTime() ?? 0)
                );
              });
            const candidate = sorted[0];
            if (!candidate) {
              const hasActiveWindow = await tx.workShift.findMany({
                where: { workspaceId, isActive: true },
              });
              const reason = hasActiveWindow.some((shift) =>
                this.support.shiftIsActive(shift, now),
              )
                ? LeadQueueReason.NO_CAPACITY
                : LeadQueueReason.NO_ACTIVE_SHIFT;
              const queued = await this.queue.queueWithinTransaction(
                tx,
                workspaceId,
                conversationId,
                reason,
              );
              return { status: 'QUEUED' as const, reason, created: queued.created };
            }
            await this.support.lockMemberRow(tx, candidate.workspaceMemberId);
            const refreshedCandidate = (
              await this.support.getCandidates(tx, workspaceId, now)
            ).find((row) => row.workspaceMemberId === candidate.workspaceMemberId);
            const recheckedCounts = await this.support.getOpenCounts(tx, workspaceId, [
              candidate.workspaceMemberId,
            ]);
            if (
              !refreshedCandidate ||
              (recheckedCounts.get(candidate.workspaceMemberId) ?? 0) >=
              refreshedCandidate.capacity
            ) {
              const queued = await this.queue.queueWithinTransaction(
                tx,
                workspaceId,
                conversationId,
                LeadQueueReason.NO_CAPACITY,
              );
              return {
                status: 'QUEUED' as const,
                reason: LeadQueueReason.NO_CAPACITY,
                created: queued.created,
              };
            }
            const current = await tx.conversation.findFirst({
              where: {
                id: conversationId,
                workspaceId,
                assignedMemberId: null,
                status: 'OPEN',
              },
            });
            if (!current) return { status: LeadRoutingStatus.SKIPPED };
            await this.support.setConversationAssignee(
              tx,
              workspaceId,
              conversationId,
              candidate.workspaceMemberId,
            );
            await this.support.markShiftMemberIdsUsed(
              tx,
              workspaceId,
              refreshedCandidate.shiftMemberIds,
            );
            const chosenShiftMember = await tx.workShiftMember.findFirst({
              where: {
                id: { in: refreshedCandidate.shiftMemberIds },
                shift: { isActive: true },
              },
              orderBy: { lastAssignedAt: 'asc' },
            });
            if (chosenShiftMember)
              await tx.workShiftMember.update({
                where: { id: chosenShiftMember.id },
                data: { lastAssignedAt: now },
              });
            await tx.leadQueueEntry.updateMany({
              where: { conversationId, status: LeadQueueStatus.WAITING },
              data: {
                status: LeadQueueStatus.ASSIGNED,
                assignedAt: now,
                resolvedAt: now,
              },
            });
            await this.audit.recordBusinessEvent(tx, {
              action: AuditAction.LEAD_AUTO_ASSIGNED,
              workspaceId,
              actorId: null,
              metadata: {
                conversationId,
                assigneeWorkspaceMemberId: candidate.workspaceMemberId,
                capacity: refreshedCandidate.capacity,
                openBefore: recheckedCounts.get(candidate.workspaceMemberId) ?? 0,
                source: 'SHIFT_ROUTING',
              },
            });
            return {
              status: LeadRoutingStatus.ASSIGNED,
              assignedMemberId: candidate.workspaceMemberId,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
    
        if (result.status === LeadRoutingStatus.ASSIGNED) {
          this.realtime?.emit(
            'conversation:assigned',
            { conversationId, assignedMemberId: result.assignedMemberId },
            workspaceId,
          );
        } else if (result.status === LeadRoutingStatus.QUEUED && result.created) {
          await this.queue.notifyQueue(workspaceId, conversationId, 0);
        }
        return result;
      }

    async getRoster(workspaceId: string, now = new Date()) {
        const candidates = await this.support.getCandidates(this.prisma, workspaceId, now);
        const counts = await this.support.getOpenCounts(
            this.prisma,
            workspaceId,
            candidates.map((candidate) => candidate.workspaceMemberId),
        );
        const activeShiftMembers = await this.prisma.workShiftMember.findMany({
            where: { shift: { workspaceId } },
            include: { shift: true, workspaceMember: { include: { user: true } } },
        });
        const memberIds = [
            ...new Set(activeShiftMembers.map((entry) => entry.workspaceMemberId)),
        ];
        const exceptionRows = await this.prisma.staffAvailabilityException.findMany(
            {
                where: {
                    workspaceId,
                    workspaceMemberId: { in: memberIds },
                    status: AvailabilityExceptionStatus.ACTIVE,
                    startsAt: { lte: now },
                    OR: [{ endsAt: null }, { endsAt: { gt: now } }],
                },
                select: {
                    id: true,
                    workspaceMemberId: true,
                    shiftId: true,
                    type: true,
                    endsAt: true,
                },
            },
        );
        const unavailable = new Set(
            exceptionRows
                .filter(
                    (item) => item.type === AvailabilityExceptionType.UNEXPECTED_LEAVE,
                )
                .map((item) => item.workspaceMemberId),
        );
        const eligibleAssignments = activeShiftMembers.filter(
            (entry) =>
                entry.shift.isActive &&
                (this.support.shiftIsActive(entry.shift, now) ||
                    exceptionRows.some(
                        (exception) =>
                            exception.type === AvailabilityExceptionType.OVERTIME_CONSENT &&
                            exception.workspaceMemberId === entry.workspaceMemberId &&
                            exception.shiftId === entry.shiftId,
                    )),
        );
        const aggregate = new Map<
            string,
            { capacity: number; manager: boolean; shiftNames: string[] }
        >();
        for (const entry of eligibleAssignments) {
            const current = aggregate.get(entry.workspaceMemberId) ?? {
                capacity: 0,
                manager: false,
                shiftNames: [],
            };
            current.capacity += entry.leadCapacity;
            current.manager ||= entry.isShiftManager;
            current.shiftNames.push(entry.shift.name);
            aggregate.set(entry.workspaceMemberId, current);
        }
        const candidateById = new Map(
            candidates.map((item) => [item.workspaceMemberId, item]),
        );
        return activeShiftMembers
            .map((entry) => {
                const state = aggregate.get(entry.workspaceMemberId) ?? {
                    capacity: 0,
                    manager: false,
                    shiftNames: [],
                };
                const active =
                    entry.workspaceMember.status === WorkspaceMemberStatus.ACTIVE &&
                    entry.workspaceMember.isActive &&
                    entry.workspaceMember.user.status === UserStatus.ACTIVE;
                const online = eligibleAssignments.some(
                    (row) => row.workspaceMemberId === entry.workspaceMemberId,
                );
                const overtime = eligibleAssignments.find(
                    (row) =>
                        row.workspaceMemberId === entry.workspaceMemberId &&
                        !this.support.shiftIsActive(row.shift, now) &&
                        exceptionRows.some(
                            (exception) =>
                                exception.type === AvailabilityExceptionType.OVERTIME_CONSENT &&
                                exception.workspaceMemberId === entry.workspaceMemberId &&
                                exception.shiftId === row.shiftId,
                        ),
                );
                const isEligible =
                    active &&
                    !entry.workspaceMember.assignmentLocked &&
                    !unavailable.has(entry.workspaceMemberId) &&
                    online &&
                    state.capacity > 0 &&
                    Boolean(candidateById.get(entry.workspaceMemberId));
                return {
                    workspaceMemberId: entry.workspaceMemberId,
                    userId: entry.workspaceMember.userId,
                    fullName: entry.workspaceMember.user.fullName,
                    email: entry.workspaceMember.user.email,
                    accountStatus: entry.workspaceMember.user.status,
                    shifts: [...new Set(state.shiftNames)],
                    shiftIds: [
                        ...new Set(
                            eligibleAssignments
                                .filter(
                                    (row) => row.workspaceMemberId === entry.workspaceMemberId,
                                )
                                .map((row) => row.shiftId),
                        ),
                    ],
                    isShiftManager: state.manager,
                    assignmentLocked: entry.workspaceMember.assignmentLocked,
                    isOnShift: online,
                    isEligible,
                    isAvailable:
                        isEligible &&
                        (counts.get(entry.workspaceMemberId) ?? 0) < state.capacity,
                    hasOvertimeConsent: Boolean(overtime),
                    overtimeConsentUntil: overtime
                        ? (exceptionRows.find(
                            (item) =>
                                item.workspaceMemberId === entry.workspaceMemberId &&
                                item.shiftId === overtime.shiftId &&
                                item.type === AvailabilityExceptionType.OVERTIME_CONSENT,
                        )?.endsAt ?? null)
                        : null,
                    openConversations: counts.get(entry.workspaceMemberId) ?? 0,
                    effectiveCapacity: state.capacity,
                    activeLeaveExceptionId:
                        exceptionRows.find(
                            (item) =>
                                item.workspaceMemberId === entry.workspaceMemberId &&
                                item.type === AvailabilityExceptionType.UNEXPECTED_LEAVE,
                        )?.id ?? null,
                };
            })
            .filter(
                (row, index, all) =>
                    all.findIndex(
                        (other) => other.workspaceMemberId === row.workspaceMemberId,
                    ) === index,
            );
    }

    async getCapacitySummary(
        workspaceId: string,
        memberId: string,
        db: Db = this.prisma,
    ) {
        return this.support.getCapacitySummary(workspaceId, memberId, db);
    }

    async markCurrentShiftUsage(
        tx: Prisma.TransactionClient,
        workspaceId: string,
        memberId: string,
    ) {
        await this.support.markCurrentShiftUsage(tx, workspaceId, memberId);
    }
}