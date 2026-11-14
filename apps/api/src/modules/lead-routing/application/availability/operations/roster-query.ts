import { AvailabilityExceptionStatus, AvailabilityExceptionType, UserStatus, WorkspaceMemberStatus } from '@prisma/client';
import { PrismaService } from '../../../../../platform/database/prisma.service.js';
import { LeadRoutingSupportService } from '../../support/lead-routing-support.service.js';
import { Db } from '../../types/routing.types.js';

/**
 * Truy vấn danh sách nhân viên trong ca trực hiện tại, tính toán hạn mức và độ tải
 */
export async function executeGetRoster(
  prisma: PrismaService,
  support: LeadRoutingSupportService,
  workspaceId: string,
  now = new Date(),
) {
  const candidates = await support.getCandidates(prisma, workspaceId, now);
  const counts = await support.getOpenCounts(
    prisma,
    workspaceId,
    candidates.map((candidate) => candidate.workspaceMemberId),
  );
  const activeShiftMembers = await prisma.workShiftMember.findMany({
    where: { shift: { workspaceId } },
    include: { shift: true, workspaceMember: { include: { user: true } } },
  });
  const memberIds = [
    ...new Set(activeShiftMembers.map((entry) => entry.workspaceMemberId)),
  ];
  const exceptionRows = await prisma.staffAvailabilityException.findMany({
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
  });
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
      (support.shiftIsActive(entry.shift, now) ||
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
          !support.shiftIsActive(row.shift, now) &&
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

export async function executeGetCapacitySummary(
  prisma: PrismaService,
  support: LeadRoutingSupportService,
  workspaceId: string,
  memberId: string,
  db: Db = prisma,
) {
  const [candidate, counts] = await Promise.all([
    support.getCandidates(db, workspaceId, new Date()).then((items) =>
      items.find((item) => item.workspaceMemberId === memberId),
    ),
    support.getOpenCounts(db, workspaceId, [memberId]),
  ]);
  const openConversations = counts.get(memberId) ?? 0;
  const effectiveCapacity = candidate?.capacity ?? 0;
  return {
    openConversations,
    effectiveCapacity,
    overCapacity: openConversations > effectiveCapacity,
  };
}
