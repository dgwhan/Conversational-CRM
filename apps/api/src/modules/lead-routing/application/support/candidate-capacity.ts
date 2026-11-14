import { AvailabilityExceptionStatus, AvailabilityExceptionType, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
import { Candidate, Db } from '../types/routing.types.js';
import { ConversationStatus } from '../constants/routing-status.constants.js';

/**
 * Lấy danh sách nhân viên đủ điều kiện nhận lead tại thời điểm hiện tại (đang trong ca hoặc overtime, không nghỉ phép)
 */
export async function getCandidates(
  db: Db,
  workspaceId: string,
  now: Date,
  shiftIsActiveFn: (shift: { startTime: string; endTime: string; timezone: string; weekdays: number[] }, instant: Date) => boolean,
): Promise<Candidate[]> {
  const rows = await db.workShiftMember.findMany({
    where: {
      shift: { workspaceId, isActive: true },
      workspaceMember: {
        workspaceId,
        status: WorkspaceMemberStatus.ACTIVE,
        isActive: true,
        assignmentLocked: false,
        user: { status: UserStatus.ACTIVE },
      },
    },
    include: {
      shift: true,
      workspaceMember: {
        include: {
          user: true,
          availabilityExceptions: {
            where: {
              status: AvailabilityExceptionStatus.ACTIVE,
              startsAt: { lte: now },
              OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
          },
        },
      },
    },
  });

  const grouped = new Map<string, Candidate>();
  for (const row of rows) {
    const exceptions = row.workspaceMember.availabilityExceptions;
    const leave = exceptions.some(
      (item) => item.type === AvailabilityExceptionType.UNEXPECTED_LEAVE,
    );
    const hasOvertime = exceptions.some(
      (item) =>
        item.type === AvailabilityExceptionType.OVERTIME_CONSENT &&
        item.shiftId === row.shiftId,
    );
    if (leave) continue;
    const inSchedule = shiftIsActiveFn(row.shift, now);
    if (!inSchedule && !hasOvertime) continue;

    const existing = grouped.get(row.workspaceMemberId) ?? {
      workspaceMemberId: row.workspaceMemberId,
      userId: row.workspaceMember.userId,
      capacity: 0,
      lastAssignedAt: null,
      shiftMemberIds: [],
    };
    existing.capacity += row.leadCapacity;
    existing.shiftMemberIds.push(row.id);
    if (
      row.lastAssignedAt &&
      (!existing.lastAssignedAt ||
        row.lastAssignedAt < existing.lastAssignedAt)
    ) {
      existing.lastAssignedAt = row.lastAssignedAt;
    }
    grouped.set(row.workspaceMemberId, existing);
  }
  return [...grouped.values()].filter((candidate) => candidate.capacity > 0);
}

export async function getOpenCounts(
  db: Db,
  workspaceId: string,
  memberIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!memberIds.length) return counts;
  const rows = await db.conversation.groupBy({
    by: ['assignedMemberId'],
    where: {
      workspaceId,
      status: ConversationStatus.OPEN,
      assignedMemberId: { in: memberIds },
    },
    _count: { _all: true },
  });
  for (const row of rows) {
    if (row.assignedMemberId) {
      counts.set(row.assignedMemberId, row._count._all);
    }
  }
  return counts;
}

export async function isOverCapacity(
  db: Db,
  workspaceId: string,
  memberId: string,
  getCandidatesFn: (db: Db, workspaceId: string, now: Date) => Promise<Candidate[]>,
  getOpenCountsFn: (db: Db, workspaceId: string, memberIds: string[]) => Promise<Map<string, number>>,
): Promise<boolean> {
  const candidate = (
    await getCandidatesFn(db, workspaceId, new Date())
  ).find((item) => item.workspaceMemberId === memberId);
  if (!candidate) return true;
  const counts = await getOpenCountsFn(db, workspaceId, [memberId]);
  return (counts.get(memberId) ?? 0) > candidate.capacity;
}
