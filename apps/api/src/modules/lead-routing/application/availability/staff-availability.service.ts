import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { AuditService } from '../../../audit/audit.service.js';
import { RealtimeService } from '../../../realtime/realtime.service.js';
import { LeadHandoverService } from '../handover/lead-handover.service.js';
import { LeadQueueService } from '../queue/lead-queue.service.js';
import { ShiftManagementService } from '../shifts/shift-management.service.js';
import { LeadRoutingSupportService } from '../support/lead-routing-support.service.js';
import { Db } from '../types/routing.types.js';
import { HandoverMode } from '../constants/routing-status.constants.js';
import { executeGetCapacitySummary, executeGetRoster } from './operations/roster-query.js';
import { executeEndUnexpectedLeave, executeSetUnexpectedLeave } from './operations/unexpected-leave.js';
import { executeRecordOvertimeConsent, executeSetAssignmentLock } from './operations/assignment-lock.js';

/**
 * Service quản lý tình trạng trực ca, hạn mức tiếp nhận và tính sẵn sàng của nhân sự
 */
@Injectable()
export class StaffAvailabilityService {
  private readonly logger = new Logger(StaffAvailabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly support: LeadRoutingSupportService,
    @Inject(forwardRef(() => ShiftManagementService))
    private readonly shiftService: any,
    @Inject(forwardRef(() => LeadQueueService))
    private readonly queueService: any,
    @Inject(forwardRef(() => LeadHandoverService))
    private readonly handoverService: any,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  /**
   * Lấy danh sách nhân viên trong ca trực hiện tại kèm hạn mức và trạng thái tiếp nhận
   */
  async getRoster(workspaceId: string, now = new Date()) {
    return executeGetRoster(this.prisma, this.support, workspaceId, now);
  }

  /**
   * Lấy báo cáo tóm tắt năng lực tiếp nhận (capacity) và số lead mở của nhân viên
   */
  async getCapacitySummary(
    workspaceId: string,
    memberId: string,
    db: Db = this.prisma,
  ) {
    return executeGetCapacitySummary(
      this.prisma,
      this.support,
      workspaceId,
      memberId,
      db,
    );
  }

  /**
   * Ghi nhận nhân viên nghỉ đột xuất và xử lý bàn giao các hội thoại mở (QUEUE hoặc TRANSFER)
   */
  async setUnexpectedLeave(
    workspaceId: string,
    actorId: string,
    shiftId: string,
    targetMemberId: string,
    mode: HandoverMode,
    assigneeId?: string,
    note?: string,
  ) {
    return executeSetUnexpectedLeave(
      this.prisma,
      this.audit,
      this.support,
      this.shiftService,
      this.queueService,
      this.realtime,
      workspaceId,
      actorId,
      shiftId,
      targetMemberId,
      mode,
      assigneeId,
      note,
    );
  }

  /**
   * Kết thúc sớm trạng thái nghỉ đột xuất của nhân viên
   */
  async endUnexpectedLeave(
    workspaceId: string,
    actorId: string,
    exceptionId: string,
  ) {
    return executeEndUnexpectedLeave(
      this.prisma,
      this.audit,
      this.support,
      this.queueService,
      this.realtime,
      workspaceId,
      actorId,
      exceptionId,
    );
  }

  /**
   * Khóa hoặc mở khóa nhận lead mới của nhân sự, tùy chọn bàn giao các hội thoại đang mở
   */
  async setAssignmentLock(
    workspaceId: string,
    actorId: string,
    memberId: string,
    locked: boolean,
    handoverMode: HandoverMode = HandoverMode.QUEUE,
    targetMemberId?: string,
  ) {
    return executeSetAssignmentLock(
      this.prisma,
      this.audit,
      this.support,
      this.shiftService,
      this.queueService,
      this.realtime,
      workspaceId,
      actorId,
      memberId,
      locked,
      handoverMode,
      targetMemberId,
    );
  }

  /**
   * Ghi nhận đồng thuận làm ngoài giờ (overtime consent) cho nhân sự
   */
  async recordOvertimeConsent(
    workspaceId: string,
    userId: string,
    shiftId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    return executeRecordOvertimeConsent(
      this.prisma,
      this.audit,
      this.queueService,
      workspaceId,
      userId,
      shiftId,
      startsAt,
      endsAt,
    );
  }
}
