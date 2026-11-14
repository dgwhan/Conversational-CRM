import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { LeadAssignmentService } from '../assignment/lead-assignment.service.js';
import { StaffAvailabilityService } from '../availability/staff-availability.service.js';
import { LeadHandoverService } from '../handover/lead-handover.service.js';
import { LeadQueueService } from '../queue/lead-queue.service.js';
import { ShiftManagementService } from '../shifts/shift-management.service.js';
import { LeadRoutingSupportService } from '../support/lead-routing-support.service.js';
import { Db } from '../types/routing.types.js';
import { ShiftInput, ShiftMemberInput } from '../types/shift.types.js';
import { HandoverMode, LeadRoutingStatus } from '../constants/routing-status.constants.js';

/**
 * Coordinator Service đóng vai trò Facade trung tâm điều phối toàn bộ các nghiệp vụ phân luồng lead:
 * Quản lý ca trực, kiểm tra tính sẵn sàng nhân viên, tự động phân bổ lead, hàng chờ và bàn giao.
 */
@Injectable()
export class LeadRoutingService {
  private readonly logger = new Logger(LeadRoutingService.name);

  constructor(
    private readonly shifts: ShiftManagementService,
    private readonly availability: StaffAvailabilityService,
    private readonly assignment: LeadAssignmentService,
    private readonly queue: LeadQueueService,
    private readonly handoverOps: LeadHandoverService,
    private readonly support: LeadRoutingSupportService,
  ) { }

  // ========================
  // Shift Management
  // ========================
  listShifts(workspaceId: string) {
    return this.shifts.listShifts(workspaceId);
  }

  createShift(workspaceId: string, actorId: string, input: ShiftInput) {
    return this.shifts.createShift(workspaceId, actorId, input);
  }

  updateShift(
    workspaceId: string,
    actorId: string,
    shiftId: string,
    patch: Partial<ShiftInput>,
  ) {
    return this.shifts.updateShift(workspaceId, actorId, shiftId, patch);
  }

  deleteUnusedShift(workspaceId: string, actorId: string, shiftId: string) {
    return this.shifts.deleteUnusedShift(workspaceId, actorId, shiftId);
  }

  replaceShiftMembers(
    workspaceId: string,
    actorId: string,
    shiftId: string,
    members: ShiftMemberInput[],
  ) {
    return this.shifts.replaceShiftMembers(workspaceId, actorId, shiftId, members);
  }

  markCurrentShiftUsage(
    tx: Prisma.TransactionClient,
    workspaceId: string,
    memberId: string,
  ) {
    return this.shifts.markCurrentShiftUsage(tx, workspaceId, memberId);
  }

  // ========================
  // Staff Availability & Roster
  // ========================
  getRoster(workspaceId: string, now = new Date()) {
    return this.availability.getRoster(workspaceId, now);
  }

  getCapacitySummary(
    workspaceId: string,
    memberId: string,
    db?: Db,
  ) {
    return this.availability.getCapacitySummary(workspaceId, memberId, db);
  }

  setUnexpectedLeave(
    workspaceId: string,
    actorId: string,
    shiftId: string,
    targetMemberId: string,
    mode: HandoverMode,
    assigneeId?: string,
    note?: string,
  ) {
    return this.availability.setUnexpectedLeave(
      workspaceId,
      actorId,
      shiftId,
      targetMemberId,
      mode,
      assigneeId,
      note,
    );
  }

  endUnexpectedLeave(
    workspaceId: string,
    actorId: string,
    exceptionId: string,
  ) {
    return this.availability.endUnexpectedLeave(workspaceId, actorId, exceptionId);
  }

  setAssignmentLock(
    workspaceId: string,
    actorId: string,
    memberId: string,
    locked: boolean,
    handoverMode: HandoverMode = HandoverMode.QUEUE,
    targetMemberId?: string,
  ) {
    return this.availability.setAssignmentLock(
      workspaceId,
      actorId,
      memberId,
      locked,
      handoverMode,
      targetMemberId,
    );
  }

  recordOvertimeConsent(
    workspaceId: string,
    userId: string,
    shiftId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    return this.availability.recordOvertimeConsent(
      workspaceId,
      userId,
      shiftId,
      startsAt,
      endsAt,
    );
  }

  // ========================
  // Lead Assignment & Routing
  // ========================
  routeNewConversation(conversationId: string, workspaceId: string) {
    return this.assignment.routeNewConversation(conversationId, workspaceId);
  }

  // ========================
  // Lead Queue
  // ========================
  listQueue(workspaceId: string, actorId: string) {
    return this.queue.listQueue(workspaceId, actorId);
  }

  claimQueueEntry(
    workspaceId: string,
    actorId: string,
    conversationId: string,
  ) {
    return this.queue.claimQueueEntry(workspaceId, actorId, conversationId);
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'lead-routing-queue-escalations' })
  async escalateWaitingLeads() {
    return this.queue.escalateWaitingLeads();
  }

  // ========================
  // Lead Handover & Offboarding
  // ========================
  handover(
    workspaceId: string,
    actorId: string,
    conversationId: string,
    targetMemberId?: string | null,
  ) {
    return this.handoverOps.handover(
      workspaceId,
      actorId,
      conversationId,
      targetMemberId,
    );
  }

  offboardMember(
    workspaceId: string,
    actorId: string,
    memberId: string,
    mode: HandoverMode,
    targetMemberId?: string,
  ) {
    return this.handoverOps.offboardMember(
      workspaceId,
      actorId,
      memberId,
      mode,
      targetMemberId,
    );
  }

  handoverMemberOpenConversations(
    workspaceId: string,
    actorId: string,
    memberId: string,
    mode: HandoverMode,
    targetMemberId?: string,
  ) {
    return this.handoverOps.handoverMemberOpenConversations(
      workspaceId,
      actorId,
      memberId,
      mode,
      targetMemberId,
    );
  }
}

