import { ForbiddenException, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { PrismaService } from "../../../../platform/database/prisma.service.js";
import { AuditService } from "../../../audit/audit.service.js";
import { RealtimeService } from "../../../realtime/realtime.service.js";
import { WorkspaceMemberStatus } from "@prisma/client";
import { LeadAssignmentService } from "./lead-assignment.service.js";
import { DEFAULT_HANDOVER_MODE, HandoverMode, type HandoverMode as HandoverModeType } from "../constants/lead-routing.constants.js";
import { LeadQueueService } from "./lead-queue.service.js";
import { LeadRoutingSupportService } from "./lead-routing-support.service.js";

@Injectable()
export class LeadHandoverService {
    private readonly logger = new Logger(LeadHandoverService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly assignment: LeadAssignmentService,
        private readonly support: LeadRoutingSupportService,
        private readonly queue: LeadQueueService,
        @Optional() private readonly realtime?: RealtimeService,
      ) { }

    async handover(
        workspaceId: string,
        actorId: string,
        conversationId: string,
        targetMemberId?: string | null,
    ) {
        const existingConversation = await this.prisma.conversation.findFirst({
            where: { id: conversationId, workspaceId },
            select: { assignedMemberId: true },
        });
        if (!existingConversation)
            throw new NotFoundException('Không tìm thấy hội thoại trong workspace.');
        const workspaceManager = await this.hasWorkspaceManagementPermission(
            workspaceId,
            actorId,
        );
        if (!workspaceManager && existingConversation.assignedMemberId) {
            await this.assertMemberManager(
                workspaceId,
                actorId,
                existingConversation.assignedMemberId,
            );
        } else if (!workspaceManager) {
            const shiftManager = await this.prisma.workspaceMember.findFirst({
                where: {
                    workspaceId,
                    userId: actorId,
                    status: WorkspaceMemberStatus.ACTIVE,
                    isActive: true,
                    shiftAssignments: { some: { isShiftManager: true } },
                },
                select: { id: true },
            });
            if (!shiftManager)
                throw new ForbiddenException(
                    'Chỉ Owner, Quản lý workspace hoặc ca trưởng mới được bàn giao lead.',
                );
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const conversation = await tx.conversation.findFirst({
                where: { id: conversationId, workspaceId },
            });
            if (!conversation)
                throw new NotFoundException(
                    'Không tìm thấy hội thoại trong workspace.',
                );
            if (!targetMemberId) {
                await this.setConversationAssignee(
                    tx,
                    workspaceId,
                    conversationId,
                    null,
                );
                const entry = await this.queueWithinTransaction(
                    tx,
                    workspaceId,
                    conversationId,
                    LeadQueueReason.HANDOVER_REQUIRED,
                );
                await this.audit.recordBusinessEvent(tx, {
                    action: AuditAction.LEAD_HANDED_OVER,
                    workspaceId,
                    actorId,
                    metadata: {
                        conversationId,
                        previousAssignee: conversation.assignedMemberId,
                        newAssignee: null,
                        queueEntryId: entry.entry.id,
                    },
                });
                return { success: true, queued: true };
            }
            const target = await tx.workspaceMember.findFirst({
                where: {
                    id: targetMemberId,
                    workspaceId,
                    status: WorkspaceMemberStatus.ACTIVE,
                    isActive: true,
                    assignmentLocked: false,
                    user: { status: UserStatus.ACTIVE },
                },
                select: { id: true },
            });
            if (!target)
                throw new BadRequestException(
                    'Người nhận không hoạt động trong workspace.',
                );
            await this.setConversationAssignee(
                tx,
                workspaceId,
                conversationId,
                targetMemberId,
            );
            await this.markCurrentShiftUsage(tx, workspaceId, targetMemberId);
            await tx.leadQueueEntry.updateMany({
                where: { conversationId, status: LeadQueueStatus.WAITING },
                data: {
                    status: LeadQueueStatus.ASSIGNED,
                    assignedAt: new Date(),
                    assignedById: actorId,
                    resolvedAt: new Date(),
                },
            });
            const overCapacity = await this.isOverCapacity(
                tx,
                workspaceId,
                targetMemberId,
            );
            await this.audit.recordBusinessEvent(tx, {
                action: AuditAction.LEAD_HANDED_OVER,
                workspaceId,
                actorId,
                metadata: {
                    conversationId,
                    previousAssignee: conversation.assignedMemberId,
                    newAssignee: targetMemberId,
                    overCapacity,
                    source: 'MANUAL_HANDOVER',
                },
            });
            return { success: true, queued: false, overCapacity };
        });
        if (result.queued)
            await this.processAndNotifyQueue(workspaceId, [conversationId]);
        this.realtime?.emit(
            'conversation:assigned',
            { conversationId, ...result },
            workspaceId,
        );
        return result;
    }



    async offboardMember(
        workspaceId: string,
        actorId: string,
        memberId: string,
        mode: 'QUEUE' | 'TRANSFER',
        targetMemberId?: string,
    ) {
        if (!(await this.hasWorkspaceManagementPermission(workspaceId, actorId))) {
            throw new ForbiddenException(
                'Chỉ Owner hoặc Quản lý workspace mới được hoàn tất bàn giao nhân viên.',
            );
        }
        const member = await this.prisma.workspaceMember.findFirst({
            where: { id: memberId, workspaceId },
        });
        if (!member)
            throw new NotFoundException('Không tìm thấy thành viên cần bàn giao.');
        const technicalOwner = await this.prisma.workspace.findFirst({
            where: {
                id: workspaceId,
                OR: [
                    { ownerId: actorId },
                    {
                        members: {
                            some: {
                                userId: actorId,
                                role: 'OWNER',
                                isActive: true,
                                status: WorkspaceMemberStatus.ACTIVE,
                            },
                        },
                    },
                ],
            },
            select: { id: true },
        });
        if (
            !technicalOwner &&
            (member.role === WorkspaceRole.OWNER)
        ) {
            throw new ForbiddenException(
                'Quản lý workspace không thể bàn giao hoặc gỡ Owner/Quản lý workspace khác.',
            );
        }
        if (mode === 'TRANSFER') {
            if (!targetMemberId || targetMemberId === memberId)
                throw new BadRequestException(
                    'Chọn một nhân viên khác để nhận bàn giao.',
                );
            const target = await this.prisma.workspaceMember.findFirst({
                where: {
                    id: targetMemberId,
                    workspaceId,
                    status: WorkspaceMemberStatus.ACTIVE,
                    isActive: true,
                    assignmentLocked: false,
                    user: { status: UserStatus.ACTIVE },
                },
            });
            if (!target)
                throw new BadRequestException(
                    'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
                );
        }
        const handoff = await this.prisma.$transaction(async (tx) => {
            await this.lockMemberRows(tx, [
                memberId,
                ...(mode === 'TRANSFER' && targetMemberId ? [targetMemberId] : []),
            ]);
            if (mode === 'TRANSFER') {
                const target = await tx.workspaceMember.findFirst({
                    where: {
                        id: targetMemberId,
                        workspaceId,
                        status: WorkspaceMemberStatus.ACTIVE,
                        isActive: true,
                        assignmentLocked: false,
                        user: { status: UserStatus.ACTIVE },
                    },
                    select: { id: true },
                });
                if (!target)
                    throw new BadRequestException(
                        'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
                    );
                await this.markCurrentShiftUsage(tx, workspaceId, target.id);
            }
            const conversations = await tx.conversation.findMany({
                where: { workspaceId, assignedMemberId: memberId, status: 'OPEN' },
                select: { id: true },
            });
            await this.audit.recordBusinessEvent(tx, {
                action: AuditAction.OFFBOARDING_STARTED,
                workspaceId,
                actorId,
                metadata: {
                    workspaceMemberId: memberId,
                    activeConversationIds: conversations.map((item) => item.id),
                    mode,
                    targetMemberId: targetMemberId ?? null,
                },
            });
            for (const conversation of conversations) {
                const previousAssignee = memberId;
                const newAssignee = mode === 'TRANSFER' ? targetMemberId! : null;
                await this.setConversationAssignee(
                    tx,
                    workspaceId,
                    conversation.id,
                    newAssignee,
                );
                if (mode === 'QUEUE')
                    await this.queueWithinTransaction(
                        tx,
                        workspaceId,
                        conversation.id,
                        LeadQueueReason.HANDOVER_REQUIRED,
                    );
                else
                    await tx.leadQueueEntry.updateMany({
                        where: {
                            conversationId: conversation.id,
                            status: LeadQueueStatus.WAITING,
                        },
                        data: {
                            status: LeadQueueStatus.ASSIGNED,
                            assignedAt: new Date(),
                            assignedById: actorId,
                            resolvedAt: new Date(),
                        },
                    });
                await this.audit.recordBusinessEvent(tx, {
                    action: AuditAction.LEAD_HANDED_OVER,
                    workspaceId,
                    actorId,
                    metadata: {
                        conversationId: conversation.id,
                        previousAssignee,
                        newAssignee,
                        reason: 'STAFF_OFFBOARDING',
                    },
                });
            }
            await tx.workspaceMember.update({
                where: { id: memberId },
                data: { isActive: false, assignmentLocked: true },
            });
            await tx.workShiftMember.deleteMany({
                where: { workspaceMemberId: memberId },
            });
            await this.audit.recordBusinessEvent(tx, {
                action: AuditAction.OFFBOARDING_COMPLETED,
                workspaceId,
                actorId,
                metadata: {
                    workspaceMemberId: memberId,
                    handedOverCount: conversations.length,
                    mode,
                    targetMemberId: targetMemberId ?? null,
                },
            });
            return {
                handedOverCount: conversations.length,
                conversationIds: conversations.map((item) => item.id),
            };
        });
        if (mode === 'QUEUE')
            await this.processAndNotifyQueue(workspaceId, handoff.conversationIds);
        else await this.processWaitingQueue(workspaceId);
        this.realtime?.emit(
            'staff:offboarded',
            { workspaceMemberId: memberId },
            workspaceId,
        );
        const overCapacity =
            mode === 'TRANSFER' && targetMemberId
                ? await this.isOverCapacity(this.prisma, workspaceId, targetMemberId)
                : false;
        return {
            success: true,
            handedOverCount: handoff.handedOverCount,
            mode,
            overCapacity,
        };
    }

    async handoverMemberOpenConversations(
        workspaceId: string,
        actorId: string,
        memberId: string,
        mode: 'QUEUE' | 'TRANSFER',
        targetMemberId?: string,
    ) {
        await this.assertMemberManager(workspaceId, actorId, memberId);
        if (mode === 'TRANSFER' && (!targetMemberId || targetMemberId === memberId))
            throw new BadRequestException(
                'Chọn một nhân viên khác để nhận bàn giao.',
            );
        const result = await this.prisma.$transaction(async (tx) => {
            await this.lockMemberRows(tx, [
                memberId,
                ...(mode === 'TRANSFER' && targetMemberId ? [targetMemberId] : []),
            ]);
            if (mode === 'TRANSFER') {
                const target = await tx.workspaceMember.findFirst({
                    where: {
                        id: targetMemberId,
                        workspaceId,
                        status: WorkspaceMemberStatus.ACTIVE,
                        isActive: true,
                        assignmentLocked: false,
                        user: { status: UserStatus.ACTIVE },
                    },
                    select: { id: true },
                });
                if (!target)
                    throw new BadRequestException(
                        'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
                    );
                await this.markCurrentShiftUsage(tx, workspaceId, target.id);
            }
            const conversations = await tx.conversation.findMany({
                where: { workspaceId, assignedMemberId: memberId, status: 'OPEN' },
                select: { id: true },
            });
            for (const conversation of conversations) {
                const newAssignee = mode === 'TRANSFER' ? targetMemberId! : null;
                await this.setConversationAssignee(
                    tx,
                    workspaceId,
                    conversation.id,
                    newAssignee,
                );
                if (mode === 'QUEUE')
                    await this.queueWithinTransaction(
                        tx,
                        workspaceId,
                        conversation.id,
                        LeadQueueReason.HANDOVER_REQUIRED,
                    );
                else
                    await tx.leadQueueEntry.updateMany({
                        where: {
                            conversationId: conversation.id,
                            status: LeadQueueStatus.WAITING,
                        },
                        data: {
                            status: LeadQueueStatus.ASSIGNED,
                            assignedAt: new Date(),
                            assignedById: actorId,
                            resolvedAt: new Date(),
                        },
                    });
                await this.audit.recordBusinessEvent(tx, {
                    action: AuditAction.LEAD_HANDED_OVER,
                    workspaceId,
                    actorId,
                    metadata: {
                        conversationId: conversation.id,
                        previousAssignee: memberId,
                        newAssignee,
                        reason: 'STAFF_OUTSIDE_SHIFT',
                    },
                });
            }
            return {
                conversationIds: conversations.map((item) => item.id),
                count: conversations.length,
            };
        });
        if (mode === 'QUEUE')
            await this.processAndNotifyQueue(workspaceId, result.conversationIds);
        else await this.processWaitingQueue(workspaceId);
        this.realtime?.emit(
            'staff:leads_handed_over',
            { workspaceMemberId: memberId, count: result.count },
            workspaceId,
        );
        const overCapacity =
            mode === 'TRANSFER' && targetMemberId
                ? await this.isOverCapacity(this.prisma, workspaceId, targetMemberId)
                : false;
        return { success: true, handedOverCount: result.count, mode, overCapacity };
    }

    async setAssignmentLock(
        workspaceId: string,
        actorId: string,
        memberId: string,
        locked: boolean,
        handoverMode: 'QUEUE' | 'TRANSFER' = 'QUEUE',
        targetMemberId?: string,
    ) {
        if (!(await this.hasWorkspaceManagementPermission(workspaceId, actorId))) {
            await this.assertMemberManager(workspaceId, actorId, memberId);
        }
        const member = await this.prisma.workspaceMember.findFirst({
            where: { id: memberId, workspaceId },
        });
        if (!member)
            throw new NotFoundException('Không tìm thấy thành viên trong workspace.');
        if (locked && handoverMode === 'TRANSFER') {
            if (!targetMemberId || targetMemberId === memberId)
                throw new BadRequestException(
                    'Chọn một nhân viên khác để nhận bàn giao.',
                );
            const target = await this.prisma.workspaceMember.findFirst({
                where: {
                    id: targetMemberId,
                    workspaceId,
                    status: WorkspaceMemberStatus.ACTIVE,
                    isActive: true,
                    assignmentLocked: false,
                    user: { status: UserStatus.ACTIVE },
                },
            });
            if (!target)
                throw new BadRequestException(
                    'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
                );
        }
        const handoff = await this.prisma.$transaction(async (tx) => {
            await this.lockMemberRows(tx, [
                memberId,
                ...(locked && handoverMode === 'TRANSFER' && targetMemberId
                    ? [targetMemberId]
                    : []),
            ]);
            if (locked && handoverMode === 'TRANSFER') {
                const target = await tx.workspaceMember.findFirst({
                    where: {
                        id: targetMemberId,
                        workspaceId,
                        status: WorkspaceMemberStatus.ACTIVE,
                        isActive: true,
                        assignmentLocked: false,
                        user: { status: UserStatus.ACTIVE },
                    },
                    select: { id: true },
                });
                if (!target)
                    throw new BadRequestException(
                        'Người nhận bàn giao không hoạt động hoặc đang bị khóa nhận lead.',
                    );
                await this.markCurrentShiftUsage(tx, workspaceId, target.id);
            }
            const conversations = locked
                ? await tx.conversation.findMany({
                    where: { workspaceId, assignedMemberId: memberId, status: 'OPEN' },
                    select: { id: true },
                })
                : [];
            await tx.workspaceMember.update({
                where: { id: memberId },
                data: { assignmentLocked: locked },
            });
            for (const conversation of conversations) {
                const newAssignee =
                    handoverMode === 'TRANSFER' ? targetMemberId! : null;
                await this.setConversationAssignee(
                    tx,
                    workspaceId,
                    conversation.id,
                    newAssignee,
                );
                if (handoverMode === 'QUEUE')
                    await this.queueWithinTransaction(
                        tx,
                        workspaceId,
                        conversation.id,
                        LeadQueueReason.HANDOVER_REQUIRED,
                    );
                else
                    await tx.leadQueueEntry.updateMany({
                        where: {
                            conversationId: conversation.id,
                            status: LeadQueueStatus.WAITING,
                        },
                        data: {
                            status: LeadQueueStatus.ASSIGNED,
                            assignedAt: new Date(),
                            assignedById: actorId,
                            resolvedAt: new Date(),
                        },
                    });
                await this.audit.recordBusinessEvent(tx, {
                    action: AuditAction.LEAD_HANDED_OVER,
                    workspaceId,
                    actorId,
                    metadata: {
                        conversationId: conversation.id,
                        previousAssignee: memberId,
                        newAssignee,
                        reason: 'STAFF_ASSIGNMENT_LOCKED',
                    },
                });
            }
            await this.audit.recordBusinessEvent(tx, {
                action: locked
                    ? AuditAction.STAFF_ASSIGNMENT_LOCKED
                    : AuditAction.STAFF_ASSIGNMENT_UNLOCKED,
                workspaceId,
                actorId,
                metadata: {
                    workspaceMemberId: memberId,
                    before: member.assignmentLocked,
                    after: locked,
                    handoverMode: locked ? handoverMode : null,
                    targetMemberId: targetMemberId ?? null,
                    handedOverCount: conversations.length,
                },
            });
            return { conversations };
        });
        this.realtime?.emit(
            'staff:availability_updated',
            { workspaceMemberId: memberId },
            workspaceId,
        );
        if (locked && handoverMode === 'QUEUE')
            await this.processAndNotifyQueue(
                workspaceId,
                handoff.conversations.map((item) => item.id),
            );
        else await this.processWaitingQueue(workspaceId);
        const overCapacity =
            locked && handoverMode === 'TRANSFER' && targetMemberId
                ? await this.isOverCapacity(this.prisma, workspaceId, targetMemberId)
                : false;
        return {
            success: true,
            assignmentLocked: locked,
            handedOverCount: handoff.conversations.length,
            overCapacity,
        };
    }


}