import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { History, Settings } from "lucide-react";
import { apiClient } from "../../../../../lib/api-client/index.js";
import { notify } from "../../../../../components/feedback/toastEmitter.js";
import { Button, Modal, Toggle } from "../../../../../components/ui/index.js";
import {
  useWorkspaceLeadRouting,
  WEEKDAY_LABELS,
  type WorkShift,
} from "../../../hooks/useWorkspaceLeadRouting.js";
import type { ManagedStaffItem } from "../../../types/staff.types.js";
import { useUserRole } from "../../../../auth/UserRoleContext.js";
import { LeadQueueSection } from "./LeadQueueSection.js";
import { ShiftAvailabilitySection } from "./ShiftAvailabilitySection.js";
import { ShiftAuditDrawer, ShiftConfigModal } from "./components/index.js";
import type { AuditEntry, AuditPage, MemberDraft } from "./types.js";
import {
  getAuditDateBounds,
  normalizeShiftTimeInput,
  toLocalDateTimeValue,
  type AuditDateRange,
} from "./utils.js";

export interface ShiftManagementTabProps {
  workspaceId: string;
  isOwner: boolean;
  focusMemberId?: string;
}

const isActiveStaff = (
  member: ManagedStaffItem,
): member is ManagedStaffItem & { memberId: string } =>
  Boolean(member.memberId && member.memberStatus === "ACTIVE");

const getMemberDraftKey = (drafts: MemberDraft[]) =>
  JSON.stringify(
    [...drafts]
      .sort((left, right) =>
        left.workspaceMemberId.localeCompare(right.workspaceMemberId),
      )
      .map(({ workspaceMemberId, leadCapacity, isShiftManager }) => ({
        workspaceMemberId,
        leadCapacity,
        isShiftManager,
      })),
  );

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const formatWeekdays = (weekdays: number[]) => {
  const selected = WEEKDAY_ORDER.filter((day) => weekdays.includes(day));
  if (!selected.length) return "Chưa chọn ngày";
  const groups: number[][] = [];
  selected.forEach((day) => {
    const currentGroup = groups[groups.length - 1];
    if (
      currentGroup &&
      WEEKDAY_ORDER.indexOf(day) ===
        WEEKDAY_ORDER.indexOf(currentGroup[currentGroup.length - 1]) + 1
    ) {
      currentGroup.push(day);
    } else {
      groups.push([day]);
    }
  });
  return groups
    .map((group) => {
      const first = WEEKDAY_LABELS[group[0]];
      const last = WEEKDAY_LABELS[group[group.length - 1]];
      return group.length > 1 ? `${first} – ${last}` : first;
    })
    .join(", ");
};

const isCurrentlyRunning = (shift: WorkShift, now = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: shift.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    const currentDay = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ].indexOf(values.weekday);
    const currentTime = `${values.hour}:${values.minute}`;
    if (currentDay < 0 || !values.hour || !values.minute) return false;

    if (shift.startTime < shift.endTime) {
      return (
        shift.weekdays.includes(currentDay) &&
        currentTime >= shift.startTime &&
        currentTime < shift.endTime
      );
    }
    if (shift.startTime === shift.endTime) return false;
    if (currentTime >= shift.startTime)
      return shift.weekdays.includes(currentDay);
    const previousDay = (currentDay + 6) % 7;
    return currentTime < shift.endTime && shift.weekdays.includes(previousDay);
  } catch {
    return false;
  }
};

export const ShiftManagementTab: React.FC<ShiftManagementTabProps> = ({
  workspaceId,
  isOwner,
  focusMemberId,
}) => {
  const routing = useWorkspaceLeadRouting(workspaceId);
  const { userId } = useUserRole();
  const [staff, setStaff] = useState<ManagedStaffItem[]>([]);
  const [staffLoadError, setStaffLoadError] = useState("");
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [absenceMemberId, setAbsenceMemberId] = useState("");
  const [absenceMode, setAbsenceMode] = useState<"QUEUE" | "TRANSFER">("QUEUE");
  const [absenceTargetId, setAbsenceTargetId] = useState("");
  const [absenceNote, setAbsenceNote] = useState("");
  const [overtimeStart, setOvertimeStart] = useState(() =>
    toLocalDateTimeValue(new Date(Math.ceil(Date.now() / 60_000) * 60_000)),
  );
  const [overtimeEnd, setOvertimeEnd] = useState(() =>
    toLocalDateTimeValue(
      new Date(Math.ceil(Date.now() / 60_000) * 60_000 + 2 * 60 * 60 * 1000),
    ),
  );
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditLoadError, setAuditLoadError] = useState("");
  const [auditRange, setAuditRange] = useState<AuditDateRange>("TODAY");
  const [customAuditStartDate, setCustomAuditStartDate] = useState("");
  const [customAuditEndDate, setCustomAuditEndDate] = useState("");
  const [appliedCustomAuditRange, setAppliedCustomAuditRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const auditWorkspaceId = useRef(workspaceId);
  const auditRequestId = useRef(0);
  const handledFocusKey = useRef("");
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [queueTargets, setQueueTargets] = useState<Record<string, string>>({});

  const selectedShift = useMemo(
    () => routing.shifts.find((shift) => shift.id === selectedShiftId),
    [routing.shifts, selectedShiftId],
  );
  const selectedShiftManager = Boolean(
    selectedShift?.members.some(
      (item) => item.isShiftManager && item.workspaceMember?.userId === userId,
    ),
  );
  const canManageSelectedShift = isOwner || selectedShiftManager;
  const canManageQueue =
    isOwner ||
    routing.shifts.some((shift) =>
      shift.members.some(
        (item) =>
          item.isShiftManager && item.workspaceMember?.userId === userId,
      ),
    );
  const activeStaff = staff.filter(isActiveStaff);
  const configChanged = Boolean(
    selectedShift &&
    (name.trim() !== selectedShift.name ||
      startTime !== selectedShift.startTime ||
      endTime !== selectedShift.endTime ||
      timezone !== selectedShift.timezone ||
      JSON.stringify([...weekdays].sort()) !==
        JSON.stringify([...selectedShift.weekdays].sort())),
  );
  const membersChanged = isCreating
    ? members.length > 0
    : Boolean(
        selectedShift &&
        getMemberDraftKey(members) !==
          getMemberDraftKey(
            selectedShift.members.map((item) => ({
              workspaceMemberId: item.workspaceMemberId,
              leadCapacity: item.leadCapacity,
              isShiftManager: item.isShiftManager,
            })),
          ),
      );
  const isDirty = isCreating
    ? Boolean(
        name.trim() ||
        startTime !== "08:00" ||
        endTime !== "17:00" ||
        timezone !== "Asia/Ho_Chi_Minh" ||
        JSON.stringify(weekdays) !== "[1,2,3,4,5]" ||
        members.length,
      )
    : configChanged || membersChanged;

  useEffect(() => {
    if (!workspaceId) return;
    let isCurrent = true;
    setStaff([]);
    setStaffLoadError("");
    void apiClient
      .get<ManagedStaffItem[]>("/workspaces/current/staff", {
        headers: { "x-workspace-id": workspaceId },
        skipToast: true,
      })
      .then((result) => {
        if (isCurrent) setStaff(result);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        const message = getErrorMessage(
          error,
          "Không thể tải danh sách nhân viên.",
        );
        setStaffLoadError(message);
        notify.error(message);
      });
    return () => {
      isCurrent = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    setSelectedShiftId("");
    setIsCreating(false);
    setIsDeleteConfirmOpen(false);
    setIsOverflowOpen(false);
    setQueueTargets({});
    setMembers([]);
    setAuditRange("TODAY");
    setCustomAuditStartDate("");
    setCustomAuditEndDate("");
    setAppliedCustomAuditRange(null);
    setName("");
    setStartTime("08:00");
    setEndTime("17:00");
    setTimezone("Asia/Ho_Chi_Minh");
    setWeekdays([1, 2, 3, 4, 5]);
  }, [workspaceId]);

  const loadAudit = useCallback(
    async (cursor?: string) => {
      if (!workspaceId || !isOwner || !selectedShiftId || !selectedShift)
        return;
      if (auditRange === "CUSTOM" && !appliedCustomAuditRange) return;
      const requestedWorkspaceId = workspaceId;
      const requestId = ++auditRequestId.current;
      setIsLoadingAudit(true);
      setAuditLoadError("");
      if (!cursor) {
        setAuditEntries([]);
        setAuditCursor(null);
      }
      try {
        const params = new URLSearchParams({ take: "20" });
        if (cursor) params.set("cursor", cursor);
        const bounds = getAuditDateBounds(
          auditRange,
          selectedShift.timezone,
          new Date(),
          appliedCustomAuditRange?.start,
          appliedCustomAuditRange?.end,
        );
        if (!bounds) return;
        params.set("shiftId", selectedShiftId);
        params.set("startAt", bounds.startAt);
        params.set("endAt", bounds.endAt);
        const page = await apiClient.get<AuditPage>(
          `/workspaces/current/audit?${params.toString()}`,
          {
            headers: { "x-workspace-id": requestedWorkspaceId },
            skipToast: true,
          },
        );
        if (
          auditWorkspaceId.current !== requestedWorkspaceId ||
          auditRequestId.current !== requestId
        )
          return;
        setAuditEntries((current) =>
          cursor ? [...current, ...page.items] : page.items,
        );
        setAuditCursor(page.nextCursor);
      } catch (error) {
        if (
          auditWorkspaceId.current === requestedWorkspaceId &&
          auditRequestId.current === requestId
        ) {
          setAuditLoadError(
            getErrorMessage(error, "Không thể tải nhật ký hoạt động."),
          );
        }
      } finally {
        if (
          auditWorkspaceId.current === requestedWorkspaceId &&
          auditRequestId.current === requestId
        ) {
          setIsLoadingAudit(false);
        }
      }
    },
    [
      appliedCustomAuditRange,
      auditRange,
      isOwner,
      selectedShift,
      selectedShiftId,
      workspaceId,
    ],
  );

  useEffect(() => {
    auditWorkspaceId.current = workspaceId;
    auditRequestId.current += 1;
    setAuditEntries([]);
    setAuditCursor(null);
    setAuditLoadError("");
  }, [workspaceId]);

  useEffect(() => {
    auditRequestId.current += 1;
    setIsLoadingAudit(false);
  }, [
    appliedCustomAuditRange,
    auditRange,
    customAuditEndDate,
    customAuditStartDate,
    selectedShiftId,
    workspaceId,
  ]);

  // Tự động chọn ca đầu tiên nếu chưa chọn ca nào và không ở chế độ tạo mới
  useEffect(() => {
    if (!selectedShiftId && !isCreating && routing.shifts.length > 0) {
      setSelectedShiftId(routing.shifts[0].id);
    }
  }, [routing.shifts, selectedShiftId, isCreating]);

  useEffect(() => {
    if (
      isOwner &&
      isAuditDrawerOpen &&
      selectedShiftId &&
      (auditRange !== "CUSTOM" || appliedCustomAuditRange)
    ) {
      void loadAudit();
    }
  }, [
    isAuditDrawerOpen,
    appliedCustomAuditRange,
    auditRange,
    isOwner,
    loadAudit,
    selectedShiftId,
  ]);

  // Khóa cuộn trang và hỗ trợ phím Esc khi Drawer Nhật ký hoạt động mở
  useEffect(() => {
    if (!isAuditDrawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsAuditDrawerOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAuditDrawerOpen]);

  useEffect(() => {
    if (!focusMemberId || !isConfigModalOpen) return;
    const timer = setTimeout(() => {
      document
        .getElementById(`shift-member-${focusMemberId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(timer);
  }, [focusMemberId, isConfigModalOpen]);

  useEffect(() => {
    if (!isOverflowOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!overflowRef.current?.contains(event.target as Node))
        setIsOverflowOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOverflowOpen]);

  const loadShiftDraft = useCallback((shift: WorkShift) => {
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setTimezone(shift.timezone);
    setWeekdays(shift.weekdays);
    setMembers(
      shift.members.map((item) => ({
        workspaceMemberId: item.workspaceMemberId,
        leadCapacity: item.leadCapacity,
        isShiftManager: item.isShiftManager,
      })),
    );
  }, []);

  useEffect(() => {
    if (!focusMemberId || !routing.shifts.length) return;
    const focusKey = `${workspaceId}:${focusMemberId}`;
    if (handledFocusKey.current === focusKey) return;
    handledFocusKey.current = focusKey;
    const targetShift = routing.shifts.find((shift) =>
      shift.members.some((item) => item.workspaceMemberId === focusMemberId),
    );
    const preferredShift =
      targetShift ||
      routing.shifts.find(
        (shift) => shift.isActive && isCurrentlyRunning(shift),
      ) ||
      routing.shifts.find((shift) => shift.isActive) ||
      routing.shifts[0];
    setSelectedShiftId(preferredShift.id);
    setIsCreating(false);
    loadShiftDraft(preferredShift);
    setIsConfigModalOpen(true);
  }, [focusMemberId, loadShiftDraft, routing.shifts, workspaceId]);

  useEffect(() => {
    if (isCreating) return;
    if (
      focusMemberId &&
      handledFocusKey.current === `${workspaceId}:${focusMemberId}`
    )
      return;
    const selectedExists = routing.shifts.some(
      (shift) => shift.id === selectedShiftId,
    );
    if (selectedExists) return;
    if (!routing.shifts.length) {
      if (selectedShiftId) setSelectedShiftId("");
      return;
    }

    const preferredShift =
      routing.shifts.find(
        (shift) => shift.isActive && isCurrentlyRunning(shift),
      ) ||
      routing.shifts.find((shift) => shift.isActive) ||
      routing.shifts[0];
    setSelectedShiftId(preferredShift.id);
    loadShiftDraft(preferredShift);
  }, [
    focusMemberId,
    isCreating,
    loadShiftDraft,
    routing.shifts,
    selectedShiftId,
    workspaceId,
  ]);

  const selectShift = (shift: WorkShift) => {
    if (
      isDirty &&
      !window.confirm("Bỏ các thay đổi chưa lưu để chuyển sang ca khác?")
    )
      return;
    setSelectedShiftId(shift.id);
    setIsCreating(false);
    loadShiftDraft(shift);
  };

  const startNewShift = () => {
    if (isDirty && !window.confirm("Bỏ các thay đổi chưa lưu để tạo ca mới?"))
      return;
    handledFocusKey.current = "";
    setSelectedShiftId("");
    setIsCreating(true);
    setName("");
    setStartTime("08:00");
    setEndTime("17:00");
    setTimezone("Asia/Ho_Chi_Minh");
    setWeekdays([1, 2, 3, 4, 5]);
    setMembers([]);
    setIsConfigModalOpen(true);
  };

  const cancelChanges = () => {
    if (isCreating) {
      handledFocusKey.current = "";
      setIsCreating(false);
      setSelectedShiftId(routing.shifts[0]?.id || "");
      setName("");
      setStartTime("08:00");
      setEndTime("17:00");
      setTimezone("Asia/Ho_Chi_Minh");
      setWeekdays([1, 2, 3, 4, 5]);
      setMembers([]);
      return;
    }
    if (selectedShift) loadShiftDraft(selectedShift);
  };

  const handleCloseConfigModal = () => {
    if (isDirty && !window.confirm("Bỏ các thay đổi chưa lưu?")) {
      return;
    }
    cancelChanges();
    setIsConfigModalOpen(false);
    setIsCreating(false);
  };

  const saveConfiguration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOwner || (!isCreating && !selectedShift)) return;
    if (!name.trim() || weekdays.length === 0) {
      notify.error("Nhập tên ca và chọn ít nhất một ngày làm việc.");
      return;
    }
    const normalizedStartTime = normalizeShiftTimeInput(startTime);
    const normalizedEndTime = normalizeShiftTimeInput(endTime);
    if (!normalizedStartTime || !normalizedEndTime) {
      notify.error("Nhập giờ theo định dạng 24 giờ, từ 00:00 đến 23:59.");
      return;
    }

    setIsSaving(true);
    let configurationSaved = false;
    try {
      const payload = {
        name: name.trim(),
        startTime: normalizedStartTime,
        endTime: normalizedEndTime,
        timezone,
        weekdays,
      };
      let targetShiftId = selectedShiftId;
      if (isCreating) {
        const created = (await routing.createShift(payload)) as WorkShift;
        targetShiftId = created.id;
        setSelectedShiftId(targetShiftId);
        setIsCreating(false);
        configurationSaved = true;
      } else if (configChanged) {
        await routing.updateShift(targetShiftId, payload);
        configurationSaved = true;
      }

      if (membersChanged && targetShiftId) {
        await routing.replaceMembers(targetShiftId, members);
      }
      notify.success("Đã lưu cấu hình và phân công nhân sự của ca.");
      setIsConfigModalOpen(false);
      setIsCreating(false);
    } catch (error) {
      const message = getErrorMessage(error, "Không thể lưu cấu hình ca.");
      notify.error(
        configurationSaved
          ? `Đã lưu thông tin ca nhưng chưa lưu được nhân sự và hạn mức. ${message}`
          : message,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStaff = (workspaceMemberId: string, checked: boolean) => {
    setMembers((current) =>
      checked
        ? [
            ...current,
            { workspaceMemberId, leadCapacity: 10, isShiftManager: false },
          ]
        : current.filter(
            (item) => item.workspaceMemberId !== workspaceMemberId,
          ),
    );
  };

  const patchMember = (
    workspaceMemberId: string,
    patch: Partial<MemberDraft>,
  ) => {
    setMembers((current) =>
      current.map((item) =>
        item.workspaceMemberId === workspaceMemberId
          ? { ...item, ...patch }
          : item,
      ),
    );
  };

  const bulkAddStaff = (workspaceMemberIds: string[], defaultCapacity = 10) => {
    setMembers((current) => {
      const existingIds = new Set(current.map((item) => item.workspaceMemberId));
      const newItems = workspaceMemberIds
        .filter((id) => !existingIds.has(id))
        .map((workspaceMemberId) => ({
          workspaceMemberId,
          leadCapacity: defaultCapacity,
          isShiftManager: false,
        }));
      return [...current, ...newItems];
    });
  };

  const bulkSetQuota = (capacity: number) => {
    setMembers((current) =>
      current.map((item) => ({ ...item, leadCapacity: capacity })),
    );
  };

  const toggleShift = async (shift: WorkShift) => {
    try {
      await routing.updateShift(shift.id, { isActive: !shift.isActive });
      notify.success(shift.isActive ? "Đã tắt ca." : "Đã bật ca.");
    } catch (error) {
      notify.error(getErrorMessage(error, "Không thể thay đổi trạng thái ca."));
    }
  };

  const removeShift = async () => {
    if (!selectedShift || selectedShift.usedAt) return;
    setIsDeleting(true);
    try {
      await routing.deleteShift(selectedShift.id);
      setIsDeleteConfirmOpen(false);
      setIsOverflowOpen(false);
      setSelectedShiftId("");
      setIsCreating(false);
      setName("");
      setMembers([]);
      notify.success("Đã xóa ca chưa sử dụng.");
    } catch (error) {
      notify.error(getErrorMessage(error, "Không thể xóa ca."));
    } finally {
      setIsDeleting(false);
    }
  };

  const submitUnexpectedLeave = async () => {
    if (!selectedShift || !absenceMemberId) return;
    try {
      const result = await routing.recordUnexpectedLeave(
        selectedShift.id,
        absenceMemberId,
        absenceMode,
        absenceTargetId || undefined,
        absenceNote,
      );
      notify.success(
        absenceMode === "QUEUE"
          ? "Đã đưa hội thoại vào hàng chờ đội."
          : "Đã bàn giao hội thoại cho nhân viên được chọn.",
      );
      if (result.overCapacity)
        notify.info(
          "Người nhận hiện vượt hạn mức hội thoại mở. Đây là cảnh báo thông tin; Owner/ca trưởng vẫn có thể bàn giao.",
        );
      setAbsenceMemberId("");
      setAbsenceTargetId("");
      setAbsenceNote("");
      setAbsenceMode("QUEUE");
    } catch (error) {
      notify.error(getErrorMessage(error, "Không thể ghi nhận nghỉ đột xuất."));
    }
  };

  const recordOvertimeConsent = async () => {
    if (!selectedShift) return;
    try {
      await routing.recordOvertimeConsent(
        selectedShift.id,
        overtimeStart,
        overtimeEnd,
      );
      notify.success(
        "Đã ghi nhận bạn đồng ý tư vấn trong khoảng thời gian ngoài ca đã chọn.",
      );
    } catch (error) {
      notify.error(
        getErrorMessage(error, "Không thể ghi nhận đồng ý ca ngoài."),
      );
    }
  };

  const endUnexpectedLeave = async (exceptionId: string) => {
    try {
      await routing.endUnexpectedLeave(exceptionId);
      notify.success("Đã kết thúc trạng thái nghỉ.");
    } catch (error) {
      notify.error(
        getErrorMessage(error, "Không thể kết thúc trạng thái nghỉ."),
      );
    }
  };

  const handoverOutsideShift = async (memberId: string) => {
    try {
      const result = await routing.handoverMemberOpen(memberId, "QUEUE");
      notify.success(
        `Đã đưa ${result.handedOverCount} hội thoại vào luồng bàn giao của đội.`,
      );
    } catch (error) {
      notify.error(getErrorMessage(error, "Không thể bàn giao hội thoại."));
    }
  };

  const assignQueuedLead = async (
    conversationId: string,
    targetMemberId: string,
  ) => {
    try {
      const result = await routing.handoverLead(
        conversationId,
        targetMemberId,
      );
      setQueueTargets((current) => ({ ...current, [conversationId]: "" }));
      if (result?.overCapacity) {
        notify.info(
          "Người nhận vượt hạn mức hội thoại mở. Đây là cảnh báo thông tin.",
        );
      } else {
        notify.success("Đã gán lead cho nhân viên được chọn.");
      }
    } catch (error) {
      notify.error(getErrorMessage(error, "Không thể gán lead."));
    }
  };

  const claimQueuedLead = async (conversationId: string) => {
    try {
      await routing.claimLead(conversationId);
    } catch (error) {
      notify.error(getErrorMessage(error, "Không thể nhận lead."));
    }
  };

  const isCustomAuditRangeValid = Boolean(
    customAuditStartDate &&
    customAuditEndDate &&
    customAuditStartDate <= customAuditEndDate,
  );

  return (
    <div className="w-full space-y-8 pb-16">
      {/* 1. Top Shift Selector Bar (Horizontal Pill Switcher) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {routing.shifts.map((shift) => {
            const isSelected = selectedShiftId === shift.id && !isCreating;
            return (
              <button
                key={shift.id}
                type="button"
                onClick={() => selectShift(shift)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer border ${
                  isSelected
                    ? "bg-blue-50 border-blue-600 text-blue-700 font-semibold shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    shift.isActive ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className="truncate">{shift.name}</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  ({shift.startTime}–{shift.endTime})
                </span>
              </button>
            );
          })}
          {!routing.shifts.length && (
            <span className="text-xs text-slate-500 italic">
              Chưa có ca làm việc nào.
            </span>
          )}
        </div>

        {isOwner && (
          <Button
            size="sm"
            variant="primary"
            onClick={startNewShift}
            className="shrink-0 text-xs px-3 py-1.5"
          >
            + Tạo ca mới
          </Button>
        )}
      </div>

      {/* 2. Main Content Area */}
      {selectedShift ? (
        <div className="space-y-8">
          {/* Active Shift Summary Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-950 m-0">
                {selectedShift.name}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 mb-0">
                {selectedShift.startTime} – {selectedShift.endTime} ·{" "}
                {formatWeekdays(selectedShift.weekdays)} ({selectedShift.members.length} nhân viên)
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                >
                  <Settings size={13} className="text-slate-500" />
                  <span>Cấu hình & Nhân sự</span>
                </button>
              )}

              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAuditDrawerOpen(true);
                    if (auditEntries.length === 0) void loadAudit();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                >
                  <History size={13} className="text-slate-500" />
                  <span>Nhật ký hoạt động</span>
                </button>
              )}

              <Toggle
                checked={selectedShift.isActive}
                onChange={() => void toggleShift(selectedShift)}
                disabled={!isOwner}
                size="md"
                showStatusLabel
                labelOn="Đang hoạt động"
                labelOff="Đang tắt"
                aria-label={selectedShift.isActive ? "Tắt ca" : "Bật ca"}
              />

              {isOwner && (
                <div className="relative" ref={overflowRef}>
                  <button
                    type="button"
                    aria-label="Thao tác khác"
                    aria-haspopup="menu"
                    aria-expanded={isOverflowOpen}
                    onClick={() => setIsOverflowOpen((open) => !open)}
                    className="flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 bg-white cursor-pointer transition-colors"
                  >
                    …
                  </button>
                  {isOverflowOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-slate-200 shadow-lg py-1 z-20"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsOverflowOpen(false);
                          setIsConfigModalOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 cursor-pointer border-none bg-transparent"
                      >
                        Chỉnh sửa cấu hình & nhân sự
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={Boolean(selectedShift.usedAt)}
                        onClick={() => {
                          setIsOverflowOpen(false);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:hover:bg-transparent cursor-pointer border-none bg-transparent"
                      >
                        {selectedShift.usedAt
                          ? "Không thể xóa ca đã dùng"
                          : "Xóa ca này"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 1. Hàng chờ chưa phân công (LeadQueueSection) - LÊN ĐẦU */}
          <LeadQueueSection
            queue={routing.queue}
            roster={routing.roster}
            targets={queueTargets}
            canManageQueue={canManageQueue}
            isLoading={routing.isLoading}
            onRefresh={() => void routing.refresh()}
            onTargetChange={(conversationId, memberId) =>
              setQueueTargets((current) => ({
                ...current,
                [conversationId]: memberId,
              }))
            }
            onAssign={(conversationId, memberId) =>
              void assignQueuedLead(conversationId, memberId)
            }
            onClaim={(conversationId) =>
              void claimQueuedLead(conversationId)
            }
          />

          {/* 2. Danh sách nhân viên trực ca + Đánh dấu nghỉ đột xuất (ở cuối) - TIẾP ĐẾN */}
          <ShiftAvailabilitySection
            shift={selectedShift}
            staff={staff}
            roster={routing.roster}
            userId={userId}
            canManage={canManageSelectedShift}
            canConfigureMembers={isOwner}
            absenceMemberId={absenceMemberId}
            absenceMode={absenceMode}
            absenceTargetId={absenceTargetId}
            absenceNote={absenceNote}
            overtimeStart={overtimeStart}
            overtimeEnd={overtimeEnd}
            onEndLeave={(exceptionId) =>
              void endUnexpectedLeave(exceptionId)
            }
            onStartLeave={(memberId) => {
              setAbsenceMemberId(memberId);
              setAbsenceMode("QUEUE");
              setAbsenceTargetId("");
            }}
            onHandoverOutsideShift={(memberId) =>
              void handoverOutsideShift(memberId)
            }
            onAbsenceModeChange={setAbsenceMode}
            onAbsenceTargetChange={setAbsenceTargetId}
            onAbsenceNoteChange={setAbsenceNote}
            onCancelLeave={() => setAbsenceMemberId("")}
            onSubmitLeave={() => void submitUnexpectedLeave()}
            onOvertimeStartChange={setOvertimeStart}
            onOvertimeEndChange={setOvertimeEnd}
            onRecordOvertimeConsent={() => void recordOvertimeConsent()}
            onAssignMembers={() => {
              setIsConfigModalOpen(true);
            }}
          />
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <h2 className="m-0 text-base font-semibold text-slate-800">
            Chưa có ca làm việc nào
          </h2>
          <p className="mb-0 mt-2 max-w-sm text-sm text-slate-500">
            Tạo ca đầu tiên để cấu hình lịch trực, phân bổ hạn mức và điều phối lead tự động.
          </p>
          {isOwner && (
            <Button
              size="sm"
              variant="primary"
              className="mt-4"
              onClick={startNewShift}
            >
              + Tạo ca mới
            </Button>
          )}
        </div>
      )}

      {/* Slide-over Drawer cho Nhật ký hoạt động */}
      <ShiftAuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        shiftName={selectedShift?.name}
        entries={auditEntries}
        staff={staff}
        cursor={auditCursor}
        isLoading={isLoadingAudit}
        loadError={auditLoadError}
        range={auditRange}
        customStartDate={customAuditStartDate}
        customEndDate={customAuditEndDate}
        isCustomApplied={Boolean(
          appliedCustomAuditRange &&
          appliedCustomAuditRange.start === customAuditStartDate &&
          appliedCustomAuditRange.end === customAuditEndDate,
        )}
        isCustomRangeValid={isCustomAuditRangeValid}
        onRangeChange={(range) => {
          setAuditRange(range);
          setAppliedCustomAuditRange(null);
          setAuditEntries([]);
          setAuditCursor(null);
        }}
        onCustomDatesChange={(startDate, endDate) => {
          setCustomAuditStartDate(startDate);
          setCustomAuditEndDate(endDate);
          setAppliedCustomAuditRange(null);
          setAuditEntries([]);
          setAuditCursor(null);
        }}
        onApplyCustomRange={() =>
          setAppliedCustomAuditRange({
            start: customAuditStartDate,
            end: customAuditEndDate,
          })
        }
        onLoad={(cursor) => void loadAudit(cursor)}
      />

      {/* Modal Cấu hình & Nhân sự ca trực */}
      <ShiftConfigModal
        isOpen={isConfigModalOpen || isCreating}
        onClose={handleCloseConfigModal}
        isCreating={isCreating}
        shiftTitle={name.trim() || selectedShift?.name || ""}
        name={name}
        startTime={startTime}
        endTime={endTime}
        timezone={timezone}
        weekdays={weekdays}
        isOwner={isOwner}
        isSaving={isSaving}
        onNameChange={setName}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        onTimezoneChange={setTimezone}
        onWeekdaysChange={setWeekdays}
        activeStaff={activeStaff}
        members={members}
        staffLoadError={staffLoadError}
        focusMemberId={focusMemberId}
        onToggleStaff={toggleStaff}
        onPatchMember={patchMember}
        onBulkAddStaff={bulkAddStaff}
        onBulkSetQuota={bulkSetQuota}
        onSave={(event) => void saveConfiguration(event)}
      />

      {/* Modal xác nhận xóa ca */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteConfirmOpen(false);
        }}
        title="Xóa ca làm việc?"
        description={`Ca "${selectedShift?.name ?? ""}" sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.`}
        primaryAction={{
          label: "Xóa ca",
          onClick: () => void removeShift(),
          variant: "danger",
          loading: isDeleting,
        }}
        secondaryAction={{
          label: "Hủy",
          onClick: () => setIsDeleteConfirmOpen(false),
          disabled: isDeleting,
        }}
        closeOnOverlayClick={!isDeleting}
        closeOnEsc={!isDeleting}
      />
    </div>
  );
};
