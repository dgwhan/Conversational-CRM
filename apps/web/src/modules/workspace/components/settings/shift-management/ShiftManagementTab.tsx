import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiClient } from "../../../../../lib/api-client/index.js";
import { notify } from "../../../../../components/feedback/toastEmitter.js";
import { Button, Modal } from "../../../../../components/ui/index.js";
import {
  useWorkspaceLeadRouting,
  WEEKDAY_LABELS,
  type WorkShift,
} from "../../../hooks/useWorkspaceLeadRouting.js";
import type { ManagedStaffItem } from "../../../types/staff.types.js";
import { useUserRole } from "../../../../auth/UserRoleContext.js";
import { LeadQueueSection } from "./LeadQueueSection.js";
import { ShiftAuditSection } from "./ShiftAuditSection.js";
import { ShiftAvailabilitySection } from "./ShiftAvailabilitySection.js";
import { ShiftMembersSection } from "./ShiftMembersSection.js";
import { ShiftScheduleSection } from "./ShiftScheduleSection.js";
import type { AuditEntry, AuditPage, MemberDraft } from "./types.js";
import {
  getAuditDateBounds,
  normalizeShiftTimeInput,
  toLocalDateTimeValue,
  type AuditDateRange,
} from "./utils.js";

type DetailsTab = "operations" | "configuration" | "audit";

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
  const [activeTab, setActiveTab] = useState<DetailsTab>("operations");
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
  const [shouldScrollToMembers, setShouldScrollToMembers] = useState(false);
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
    setActiveTab("operations");
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

  useEffect(() => {
    if (
      isOwner &&
      activeTab === "audit" &&
      selectedShiftId &&
      (auditRange !== "CUSTOM" || appliedCustomAuditRange)
    ) {
      void loadAudit();
    }
  }, [
    activeTab,
    appliedCustomAuditRange,
    auditRange,
    isOwner,
    loadAudit,
    selectedShiftId,
  ]);

  useEffect(() => {
    if (activeTab !== "configuration" || !shouldScrollToMembers) return;
    document
      .getElementById(
        focusMemberId
          ? `shift-member-${focusMemberId}`
          : "shift-members-section",
      )
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setShouldScrollToMembers(false);
  }, [activeTab, focusMemberId, shouldScrollToMembers]);

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
    setActiveTab("configuration");
    loadShiftDraft(preferredShift);
    setShouldScrollToMembers(true);
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
    setActiveTab("operations");
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
    setActiveTab("operations");
    loadShiftDraft(shift);
  };

  const startNewShift = () => {
    if (isDirty && !window.confirm("Bỏ các thay đổi chưa lưu để tạo ca mới?"))
      return;
    handledFocusKey.current = "";
    setSelectedShiftId("");
    setIsCreating(true);
    setActiveTab("configuration");
    setName("");
    setStartTime("08:00");
    setEndTime("17:00");
    setTimezone("Asia/Ho_Chi_Minh");
    setWeekdays([1, 2, 3, 4, 5]);
    setMembers([]);
  };

  const cancelChanges = () => {
    if (isCreating) {
      handledFocusKey.current = "";
      setIsCreating(false);
      setSelectedShiftId("");
      setActiveTab("operations");
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
      setActiveTab("operations");
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
      const result = (await routing.handoverLead(
        conversationId,
        targetMemberId,
      )) as { overCapacity?: boolean } | undefined;
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

  const detailTitle = isCreating
    ? name.trim() || "Ca mới"
    : selectedShift?.name || "";
  const tabs: Array<{ id: DetailsTab; label: string; disabled?: boolean }> = [
    { id: "operations", label: "Vận hành & Trực ca", disabled: !selectedShift },
    { id: "configuration", label: "Cấu hình & Nhân sự" },
    ...(isOwner
      ? [
          {
            id: "audit" as const,
            label: "Nhật ký hoạt động",
            disabled: !selectedShift,
          },
        ]
      : []),
  ];
  const isCustomAuditRangeValid = Boolean(
    customAuditStartDate &&
    customAuditEndDate &&
    customAuditStartDate <= customAuditEndDate,
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(220px,0.28fr)_minmax(0,0.72fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:p-4 lg:sticky lg:top-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-sm font-bold text-slate-900">
              Ca làm việc
            </h2>
            <p className="mb-0 mt-1 text-xs text-slate-500">
              {routing.shifts.length} ca đã cấu hình
            </p>
          </div>
          {isOwner && (
            <Button size="sm" variant="primary" onClick={startNewShift}>
              + Tạo ca mới
            </Button>
          )}
        </div>
        <div className="grid max-h-[65vh] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-1">
          {routing.shifts.map((shift) => {
            const isSelected = selectedShiftId === shift.id && !isCreating;
            return (
              <button
                key={shift.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectShift(shift)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-blue-400 bg-blue-50/70 ring-1 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                    {shift.name}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      shift.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {shift.isActive ? "Đang bật" : "Đang tắt"}
                  </span>
                </span>
                <span className="mt-2 block text-xs text-slate-600">
                  {shift.startTime}–{shift.endTime} ·{" "}
                  {formatWeekdays(shift.weekdays)}
                </span>
                <span className="mt-1 block text-[11px] text-slate-500">
                  {shift.members.length} nhân viên
                </span>
              </button>
            );
          })}
          {!routing.shifts.length && (
            <p className="mb-0 rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-xs text-slate-500 sm:col-span-2 lg:col-span-1">
              Chưa có ca làm việc. Tạo ca đầu tiên để cấu hình lịch và phân
              lead.
            </p>
          )}
        </div>
      </aside>

      <main className="min-w-0">
        {selectedShift || isCreating ? (
          <>
            <header className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-4 py-1">
              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {isCreating ? "TẠO LỊCH TRỰC MỚI" : "CHI TIẾT CA TRỰC"}
                  </p>
                  <h2 className="m-0 truncate text-lg font-bold text-slate-900">
                    {detailTitle}
                  </h2>
                  {selectedShift && (
                    <p className="mb-0 mt-1 text-xs text-slate-500">
                      {selectedShift.startTime} – {selectedShift.endTime} ·{" "}
                      {formatWeekdays(selectedShift.weekdays)}
                    </p>
                  )}
                </div>
              </div>
              {selectedShift && (
                <div className="ml-auto flex shrink-0 items-center gap-3">
                  <div className="flex shrink-0 items-center gap-2">
                    {isOwner && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={selectedShift.isActive}
                        aria-label={
                          selectedShift.isActive ? "Tắt ca" : "Bật ca"
                        }
                        onClick={() => void toggleShift(selectedShift)}
                        className={`relative block h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                          selectedShift.isActive
                            ? "bg-emerald-600"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
                            selectedShift.isActive
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    )}
                    <span
                      className={`whitespace-nowrap text-xs font-medium ${
                        selectedShift.isActive
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }`}
                    >
                      {selectedShift.isActive ? "Đang hoạt động" : "Đang tắt"}
                    </span>
                  </div>
                  {isOwner && (
                    <div className="relative" ref={overflowRef}>
                      <button
                        type="button"
                        aria-label="Thao tác khác"
                        aria-haspopup="menu"
                        aria-expanded={isOverflowOpen}
                        onClick={() => setIsOverflowOpen((open) => !open)}
                        className="flex size-8 items-center justify-center rounded-md text-xl leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        …
                      </button>
                      {isOverflowOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled={Boolean(selectedShift.usedAt)}
                            onClick={() => {
                              setIsOverflowOpen(false);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-white"
                          >
                            {selectedShift.usedAt
                              ? "Không thể xóa ca đã sử dụng"
                              : "Xóa ca"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </header>

            <div
              role="tablist"
              aria-label="Nội dung ca trực"
              className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200"
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`shift-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`shift-panel-${tab.id}`}
                  disabled={tab.disabled}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div
              id="shift-panel-operations"
              role="tabpanel"
              aria-labelledby="shift-tab-operations"
              hidden={activeTab !== "operations"}
              className="space-y-4"
            >
              {selectedShift && (
                <>
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
                      setShouldScrollToMembers(true);
                      setActiveTab("configuration");
                    }}
                  />
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
                </>
              )}
            </div>

            <div
              id="shift-panel-configuration"
              role="tabpanel"
              aria-labelledby="shift-tab-configuration"
              hidden={activeTab !== "configuration"}
            >
              <form
                id="shift-configuration-form"
                onSubmit={(event) => void saveConfiguration(event)}
                className="space-y-4"
              >
                <ShiftScheduleSection
                  name={name}
                  startTime={startTime}
                  endTime={endTime}
                  timezone={timezone}
                  weekdays={weekdays}
                  disabled={!isOwner}
                  onNameChange={setName}
                  onStartTimeChange={setStartTime}
                  onEndTimeChange={setEndTime}
                  onTimezoneChange={setTimezone}
                  onWeekdaysChange={setWeekdays}
                />
                {isOwner && (
                  <ShiftMembersSection
                    staff={activeStaff}
                    members={members}
                    loadError={staffLoadError}
                    focusMemberId={focusMemberId}
                    onToggleStaff={toggleStaff}
                    onPatchMember={patchMember}
                  />
                )}
              </form>
            </div>

            {isOwner && (
              <div
                id="shift-panel-audit"
                role="tabpanel"
                aria-labelledby="shift-tab-audit"
                hidden={activeTab !== "audit"}
              >
                <ShiftAuditSection
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
              </div>
            )}

            {isOwner && isDirty && (
              <div className="sticky bottom-2 z-30 mt-4 flex justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelChanges}
                  disabled={isSaving}
                >
                  Hủy thay đổi
                </Button>
                <Button
                  type="submit"
                  form="shift-configuration-form"
                  variant="primary"
                  loading={isSaving}
                >
                  Lưu thay đổi
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <h2 className="m-0 text-base font-semibold text-slate-800">
              Chọn một ca làm việc
            </h2>
            <p className="mb-0 mt-2 max-w-sm text-sm text-slate-500">
              Chọn ca ở danh sách bên trái để theo dõi trực ca, phân lead và
              quản lý nhân sự.
            </p>
            {!routing.shifts.length && isOwner && (
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
      </main>

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
