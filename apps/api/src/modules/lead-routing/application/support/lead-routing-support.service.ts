import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { TIME_RE, shiftIsActive, timeToMinutes } from '../../domain/utils/shift-time.util.js';
import { Candidate, Db } from '../types/routing.types.js';
import { ShiftInput } from '../types/shift.types.js';
import { assertMemberManager, assertQueueAccess, assertShiftManager, hasWorkspaceManagementPermission, isWorkspaceOwner } from './routing-permissions.js';
import { getCandidates, getOpenCounts, isOverCapacity } from './candidate-capacity.js';

/**
 * Service hỗ trợ (Support Helper) cho Lead Routing: Kiểm tra quyền hạn, xác thực ca trực và tính toán ứng viên hợp lệ
 */
@Injectable()
export class LeadRoutingSupportService {
  private readonly logger = new Logger(LeadRoutingSupportService.name);

  constructor(private readonly prisma: PrismaService) {}

  timeToMinutes(time: string): number {
    return timeToMinutes(time);
  }

  shiftIsActive(
    shift: {
      startTime: string;
      endTime: string;
      timezone: string;
      weekdays: number[];
    },
    instant: Date,
  ): boolean {
    return shiftIsActive(shift, instant);
  }

  validateShift(input: ShiftInput): void {
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.trim().length > 120
    ) {
      throw new BadRequestException('Tên ca là bắt buộc và tối đa 120 ký tự.');
    }
    if (
      typeof input.startTime !== 'string' ||
      typeof input.endTime !== 'string' ||
      (input.timezone !== undefined && typeof input.timezone !== 'string')
    ) {
      throw new BadRequestException('Khung giờ hoặc múi giờ ca không hợp lệ.');
    }
    if (
      !TIME_RE.test(input.startTime) ||
      !TIME_RE.test(input.endTime) ||
      input.startTime === input.endTime
    ) {
      throw new BadRequestException('Khung giờ ca không hợp lệ.');
    }
    if (
      !Array.isArray(input.weekdays) ||
      !input.weekdays.length ||
      input.weekdays.some(
        (day) => !Number.isInteger(day) || day < 0 || day > 6,
      )
    ) {
      throw new BadRequestException(
        'Chọn ít nhất một ngày áp dụng từ 0 đến 6.',
      );
    }
    try {
      new Intl.DateTimeFormat('en-US', {
        timeZone: input.timezone || 'Asia/Ho_Chi_Minh',
      });
    } catch {
      throw new BadRequestException('Múi giờ không hợp lệ.');
    }
  }

  async hasWorkspaceManagementPermission(
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    return hasWorkspaceManagementPermission(this.prisma, workspaceId, userId);
  }

  async isWorkspaceOwner(
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    return isWorkspaceOwner(this.prisma, workspaceId, userId);
  }

  async assertShiftManager(
    workspaceId: string,
    actorId: string,
    shiftId: string,
  ): Promise<void> {
    return assertShiftManager(this.prisma, workspaceId, actorId, shiftId);
  }

  async assertMemberManager(
    workspaceId: string,
    actorId: string,
    memberId: string,
  ): Promise<void> {
    return assertMemberManager(this.prisma, workspaceId, actorId, memberId);
  }

  async assertQueueAccess(
    workspaceId: string,
    actorId: string,
  ): Promise<void> {
    return assertQueueAccess(
      this.prisma,
      workspaceId,
      actorId,
      (db, wsId, now) => this.getCandidates(db, wsId, now),
    );
  }

  async getCandidates(
    db: Db,
    workspaceId: string,
    now: Date,
  ): Promise<Candidate[]> {
    return getCandidates(db, workspaceId, now, (s, d) => this.shiftIsActive(s, d));
  }

  async getOpenCounts(
    db: Db,
    workspaceId: string,
    memberIds: string[],
  ): Promise<Map<string, number>> {
    return getOpenCounts(db, workspaceId, memberIds);
  }

  async isOverCapacity(
    db: Db,
    workspaceId: string,
    memberId: string,
  ): Promise<boolean> {
    return isOverCapacity(
      db,
      workspaceId,
      memberId,
      (d, ws, now) => this.getCandidates(d, ws, now),
      (d, ws, mIds) => this.getOpenCounts(d, ws, mIds),
    );
  }

  async markShiftMemberIdsUsed(
    db: Db,
    workspaceId: string,
    shiftMemberIds: string[],
  ): Promise<void> {
    if (!shiftMemberIds.length) return;
    await db.workShift.updateMany({
      where: {
        workspaceId,
        usedAt: null,
        members: { some: { id: { in: shiftMemberIds } } },
      },
      data: { usedAt: new Date() },
    });
  }

  async markCurrentShiftUsage(
    db: Db,
    workspaceId: string,
    memberId: string,
  ): Promise<void> {
    const candidates = await this.getCandidates(db, workspaceId, new Date());
    const candidate = candidates.find((item) => item.workspaceMemberId === memberId);
    if (candidate) {
      await this.markShiftMemberIdsUsed(
        db,
        workspaceId,
        candidate.shiftMemberIds,
      );
    }
  }
}
