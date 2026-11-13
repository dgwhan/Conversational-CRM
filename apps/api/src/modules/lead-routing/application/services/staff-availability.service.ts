import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { AuditAction, AvailabilityExceptionStatus, AvailabilityExceptionType, LeadQueueReason, LeadQueueStatus, UserStatus, WorkspaceMemberStatus } from "@prisma/client";
import { PrismaService } from "../../../../platform/database/prisma.service.js";
import { AuditService } from "../../../audit/audit.service.js";
import { RealtimeService } from "../../../realtime/realtime.service.js";
import { HandoverMode, type HandoverMode as HandoverModeType } from "../constants/lead-routing.constants.js";
import { LeadQueueService } from "./lead-queue.service.js";
import { LeadRoutingSupportService } from "./lead-routing-support.service.js";

@Injectable()
export class StaffAvailabilityService {
    private readonly logger = new Logger(StaffAvailabilityService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly support: LeadRoutingSupportService,
        private readonly queue: LeadQueueService,
        @Optional() private readonly realtime?: RealtimeService,
      ) { }

    async setUnexpectedLeave(
        workspaceId: string,
        actorId: string,
        shiftId: string,
        targetMemberId: string,
        mode: HandoverModeType,
        assigneeId?: string,
        note?: string,
      ) {
        await this.support.assertShiftManager(workspaceId, actorId, shiftId);
        const cleanNote = typeof note === 'string' ? note.trim().slice(0, 500) : '';
        const shiftMember = await this.prisma.workShiftMember.findFirst({
          where: {
            shiftId,
            workspaceMemberId: targetMemberId,
            shift: { workspaceId },
          },
        });
        if (!shiftMember)
          throw new NotFoundException('Nhân viên không thuộc ca này.');
        const existingException =
          await this.prisma.staffAvailabilityException.findFirst({
            where: {
              workspaceId,
              workspaceMemberId: targetMemberId,
              type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
              status: AvailabilityExceptionStatus.ACTIVE,
              startsAt: { lte: new Date() },
              OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
            },
            select: { id: true },
          });
        if (existingException)
          throw new ConflictException('Nhân viên đã được đánh dấu nghỉ đột xuất.');
        if (mode === HandoverMode.TRANSFER && !assigneeId)
          throw new BadRequestException('Chọn nhân viên nhận bàn giao.');
        if (mode === HandoverMode.TRANSFER && assigneeId === targetMemberId)
          throw new BadRequestException(
            'Chọn một nhân viên khác để nhận bàn giao.',
          );
        const result = await this.prisma.$transaction(async (tx) => {
          await this.support.lockMemberRows(tx, [
            targetMemberId,
            ...(mode === HandoverMode.TRANSFER && assigneeId ? [assigneeId] : []),
          ]);
          const activeLeave = await tx.staffAvailabilityException.findFirst({
            where: {
              workspaceId,
              workspaceMemberId: targetMemberId,
              type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
              status: AvailabilityExceptionStatus.ACTIVE,
              startsAt: { lte: new Date() },
              OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
            },
            select: { id: true },
          });
          if (activeLeave)
            throw new ConflictException(
              'Nhân viên đã được đánh dấu nghỉ đột xuất.',
            );
          const affected = await tx.conversation.findMany({
            where: {
              workspaceId,
              assignedMemberId: targetMemberId,
              status: 'OPEN',
            },
            select: { id: true },
          });
          const created = await tx.staffAvailabilityException.create({
            data: {
              workspaceId,
              workspaceMemberId: targetMemberId,
              shiftId,
              type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
              startsAt: new Date(),
              status: AvailabilityExceptionStatus.ACTIVE,
              requestedById: actorId,
              approvedById: actorId,
              reasonCode: 'UNEXPECTED_LEAVE',
              note: cleanNote || null,
            },
          });
          if (mode === HandoverMode.QUEUE) {
            for (const item of affected) {
              await this.support.setConversationAssignee(tx, workspaceId, item.id, null);
              await this.queue.queueWithinTransaction(
                tx,
                workspaceId,
                item.id,
                LeadQueueReason.UNEXPECTED_LEAVE,
              );
            }
          } else {
            const destination = await tx.workspaceMember.findFirst({
              where: {
                id: assigneeId,
                workspaceId,
                status: WorkspaceMemberStatus.ACTIVE,
                isActive: true,
                assignmentLocked: false,
                user: { status: UserStatus.ACTIVE },
              },
            });
            if (!destination)
              throw new BadRequestException(
                'Người nhận bàn giao không hoạt động trong workspace.',
              );
            await this.support.markCurrentShiftUsage(tx, workspaceId, destination.id);
            for (const item of affected) {
              await this.support.setConversationAssignee(
                tx,
                workspaceId,
                item.id,
                destination.id,
              );
              await tx.leadQueueEntry.updateMany({
                where: { conversationId: item.id, status: LeadQueueStatus.WAITING },
                data: {
                  status: LeadQueueStatus.ASSIGNED,
                  assignedAt: new Date(),
                  assignedById: actorId,
                  resolvedAt: new Date(),
                },
              });
            }
          }
          await this.audit.recordBusinessEvent(tx, {
            action: AuditAction.STAFF_ABSENCE_RECORDED,
            workspaceId,
            actorId,
            metadata: {
              exceptionId: created.id,
              shiftId,
              workspaceMemberId: targetMemberId,
              mode,
              affectedConversationIds: affected.map((item) => item.id),
              assigneeId: assigneeId ?? null,
              note: cleanNote || null,
            },
          });
          return { exception: created, affected };
        });
        if (mode === HandoverMode.QUEUE) {
          await this.queue.processAndNotifyQueue(
            workspaceId,
            result.affected.map((item) => item.id),
          );
        }
        this.realtime?.emit(
          'staff:availability_updated',
          { workspaceMemberId: targetMemberId },
          workspaceId,
        );
        const overCapacity =
          mode === HandoverMode.TRANSFER && assigneeId
            ? await this.support.isOverCapacity(this.prisma, workspaceId, assigneeId)
            : false;
        return {
          exception: result.exception,
          affectedCount: result.affected.length,
          overCapacity,
        };
      }
    
      async endUnexpectedLeave(
        workspaceId: string,
        actorId: string,
        exceptionId: string,
      ) {
        const exception = await this.prisma.staffAvailabilityException.findFirst({
          where: {
            id: exceptionId,
            workspaceId,
            type: AvailabilityExceptionType.UNEXPECTED_LEAVE,
            status: AvailabilityExceptionStatus.ACTIVE,
          },
        });
        if (!exception)
          throw new NotFoundException(
            'Không tìm thấy trạng thái nghỉ đang hoạt động.',
          );
        await this.support.assertMemberManager(
          workspaceId,
          actorId,
          exception.workspaceMemberId,
        );
        const updated = await this.prisma.$transaction(async (tx) => {
          const result = await tx.staffAvailabilityException.update({
            where: { id: exception.id },
            data: { status: AvailabilityExceptionStatus.ENDED, endsAt: new Date() },
          });
          await this.audit.recordBusinessEvent(tx, {
            action: AuditAction.STAFF_ABSENCE_ENDED,
            workspaceId,
            actorId,
            metadata: {
              exceptionId,
              shiftId: exception.shiftId,
              workspaceMemberId: exception.workspaceMemberId,
            },
          });
          return result;
        });
        this.realtime?.emit(
          'staff:availability_updated',
          { workspaceMemberId: exception.workspaceMemberId },
          workspaceId,
        );
        await this.queue.processWaitingQueue(workspaceId);
        return updated;
      }

      async recordOvertimeConsent(
          workspaceId: string,
          userId: string,
          shiftId: string,
          startsAt: Date,
          endsAt: Date,
        ) {
          if (
            !(startsAt instanceof Date) ||
            !(endsAt instanceof Date) ||
            !Number.isFinite(startsAt.getTime()) ||
            !Number.isFinite(endsAt.getTime()) ||
            startsAt.getTime() < Date.now() ||
            endsAt <= startsAt
          )
            throw new BadRequestException('Khoảng thời gian ca ngoài không hợp lệ.');
          const assignment = await this.prisma.workShiftMember.findFirst({
            where: {
              shiftId,
              shift: { workspaceId },
              workspaceMember: {
                userId,
                status: WorkspaceMemberStatus.ACTIVE,
                isActive: true,
              },
            },
            include: { workspaceMember: true },
          });
          if (!assignment)
            throw new NotFoundException('Không tìm thấy phân ca của nhân viên.');
          const exception = await this.prisma.$transaction(async (tx) => {
            const item = await tx.staffAvailabilityException.create({
              data: {
                workspaceId,
                workspaceMemberId: assignment.workspaceMemberId,
                shiftId,
                type: AvailabilityExceptionType.OVERTIME_CONSENT,
                startsAt,
                endsAt,
                status: AvailabilityExceptionStatus.ACTIVE,
                requestedById: userId,
                approvedById: userId,
                consentAt: new Date(),
              },
            });
            await this.audit.recordBusinessEvent(tx, {
              action: AuditAction.OVERTIME_CONSENT_RECORDED,
              workspaceId,
              actorId: userId,
              metadata: {
                exceptionId: item.id,
                workspaceMemberId: assignment.workspaceMemberId,
                shiftId,
                startsAt,
                endsAt,
                consentAt: item.consentAt,
              },
            });
            return item;
          });
          await this.queue.processWaitingQueue(workspaceId);
          return exception;
        }
}