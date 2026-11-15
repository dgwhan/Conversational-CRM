import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  X,
  Users,
} from "lucide-react";
import type { ManagedStaffItem } from "../../../types/staff.types.js";
import type { MemberDraft } from "./types.js";
import { ShiftSection } from "./ShiftSection.js";

type ActiveStaffMember = ManagedStaffItem & { memberId: string };

export interface ShiftMembersSectionProps {
  staff: ActiveStaffMember[];
  members: MemberDraft[];
  loadError?: string;
  focusMemberId?: string;
  onToggleStaff: (workspaceMemberId: string, checked: boolean) => void;
  onPatchMember: (
    workspaceMemberId: string,
    patch: Partial<MemberDraft>,
  ) => void;
  onBulkAddStaff?: (workspaceMemberIds: string[], defaultCapacity?: number) => void;
  onBulkSetQuota?: (capacity: number) => void;
}

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0] ?? "")
    .join("")
    .toLocaleUpperCase("vi");

export const ShiftMembersSection: React.FC<ShiftMembersSectionProps> = ({
  staff,
  members,
  loadError,
  focusMemberId,
  onToggleStaff,
  onPatchMember,
  onBulkAddStaff,
  onBulkSetQuota,
}) => {
  // Combobox quick-add state
  const [comboboxQuery, setComboboxQuery] = useState("");
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  const [selectedForAdd, setSelectedForAdd] = useState<string[]>([]);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Bulk quota state
  const [bulkQuotaInput, setBulkQuotaInput] = useState("10");

  // In-roster filter state
  const [inRosterSearch, setInRosterSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "MANAGER" | "MEMBER">("ALL");

  // Close combobox dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setIsComboboxOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Map of memberId -> draft
  const membersMap = useMemo(() => {
    return new Map(members.map((m) => [m.workspaceMemberId, m]));
  }, [members]);

  // Assigned staff items
  const assignedStaff = useMemo(() => {
    return staff.filter((person) => membersMap.has(person.memberId));
  }, [staff, membersMap]);

  // Unassigned staff items for quick-add picker
  const unassignedStaff = useMemo(() => {
    return staff.filter((person) => !membersMap.has(person.memberId));
  }, [staff, membersMap]);

  // Filtered unassigned staff based on search query
  const filteredUnassigned = useMemo(() => {
    const q = comboboxQuery.trim().toLowerCase();
    if (!q) return unassignedStaff;
    return unassignedStaff.filter((person) => {
      const name = (person.fullName || "").toLowerCase();
      const email = (person.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [unassignedStaff, comboboxQuery]);

  // Filtered assigned staff inside table based on search & role filter
  const displayedAssignedStaff = useMemo(() => {
    return assignedStaff.filter((person) => {
      const draft = membersMap.get(person.memberId);
      if (!draft) return false;

      // Role filter
      if (roleFilter === "MANAGER" && !draft.isShiftManager) return false;
      if (roleFilter === "MEMBER" && draft.isShiftManager) return false;

      // Search query in roster
      const q = inRosterSearch.trim().toLowerCase();
      if (q) {
        const name = (person.fullName || "").toLowerCase();
        const email = (person.email || "").toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }

      return true;
    });
  }, [assignedStaff, membersMap, roleFilter, inRosterSearch]);

  // Handle single quick add
  const handleQuickAddSingle = (memberId: string) => {
    if (onBulkAddStaff) {
      onBulkAddStaff([memberId], 10);
    } else {
      onToggleStaff(memberId, true);
    }
    // Remove from selected if present
    setSelectedForAdd((prev) => prev.filter((id) => id !== memberId));
  };

  // Handle bulk add from combobox selection
  const handleAddSelected = () => {
    if (selectedForAdd.length === 0) return;
    if (onBulkAddStaff) {
      onBulkAddStaff(selectedForAdd, 10);
    } else {
      selectedForAdd.forEach((id) => onToggleStaff(id, true));
    }
    setSelectedForAdd([]);
    setComboboxQuery("");
    setIsComboboxOpen(false);
  };

  // Toggle selection for bulk add
  const toggleSelectForAdd = (memberId: string) => {
    setSelectedForAdd((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  // Apply bulk quota
  const handleApplyBulkQuota = () => {
    const quota = Math.max(0, Math.min(10000, Number(bulkQuotaInput) || 0));
    if (onBulkSetQuota) {
      onBulkSetQuota(quota);
    } else {
      assignedStaff.forEach((person) => {
        onPatchMember(person.memberId, { leadCapacity: quota });
      });
    }
  };

  const managerCount = useMemo(
    () => assignedStaff.filter((p) => membersMap.get(p.memberId)?.isShiftManager).length,
    [assignedStaff, membersMap],
  );

  return (
    <ShiftSection
      id="shift-members-section"
      title="Nhân sự và hạn mức"
      help={{
        title: "Nhân sự và hạn mức trong ca",
        description:
          "Danh sách phân công nhân sự trực thuộc ca làm việc kèm vai trò điều phối (Ca trưởng) và hạn mức số lượng khách hàng tối đa được phân bổ.",
        example:
          "Hệ thống điều phối khách hàng theo cơ chế vòng tròn (Round-Robin) → Khi một nhân sự chạm hạn mức tối đa 10 khách hàng, hệ thống tự động bỏ qua và chuyển lượt cho nhân sự kế tiếp còn hạn mức.",
        rules: [
          "Chỉ những nhân sự được chọn vào danh sách ca mới được hệ thống tự động chia sẻ khách hàng trong ca.",
          "Vai trò Ca trưởng có thẩm quyền can thiệp phân bổ thủ công và nhận cảnh báo khi hàng chờ ứ đọng.",
          "Hạn mức bằng 0 biểu thị không giới hạn số lượng khách hàng tối đa mà nhân sự có thể tiếp nhận.",
        ],
      }}
    >
      {/* 1. Quick-Add Staff Combobox & Bulk Quota Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2">
        {/* Quick-Add Staff Combobox */}
        <div className="flex-1 relative" ref={comboboxRef}>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={comboboxQuery}
              onFocus={() => setIsComboboxOpen(true)}
              onChange={(e) => {
                setComboboxQuery(e.target.value);
                setIsComboboxOpen(true);
              }}
              placeholder="Tìm và thêm nhân viên vào ca theo tên, email..."
              className="w-full h-9 pl-9 pr-8 bg-slate-100/80 rounded-md border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition-all box-border"
            />
            {comboboxQuery && (
              <button
                type="button"
                onClick={() => setComboboxQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Searchable Dropdown of Unassigned Staff */}
          {isComboboxOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-72 overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>
                  Nhân viên chưa vào ca ({filteredUnassigned.length})
                </span>
                {filteredUnassigned.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedForAdd.length === filteredUnassigned.length) {
                        setSelectedForAdd([]);
                      } else {
                        setSelectedForAdd(filteredUnassigned.map((p) => p.memberId));
                      }
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    {selectedForAdd.length === filteredUnassigned.length
                      ? "Bỏ chọn tất cả"
                      : "Chọn tất cả"}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
                {filteredUnassigned.length === 0 ? (
                  <div className="py-6 px-3 text-center text-xs text-slate-400">
                    {unassignedStaff.length === 0
                      ? "Tất cả nhân viên trong workspace đã được phân công vào ca này."
                      : "Không tìm thấy nhân viên nào phù hợp."}
                  </div>
                ) : (
                  filteredUnassigned.map((person) => {
                    const isSelected = selectedForAdd.includes(person.memberId);
                    const displayName = person.fullName?.trim() || person.email;
                    return (
                      <div
                        key={person.memberId}
                        className="flex items-center justify-between gap-2.5 px-2.5 py-1.5 hover:bg-slate-50 rounded-md transition-colors"
                      >
                        <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectForAdd(person.memberId)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer shrink-0"
                          />
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">
                            {getInitials(displayName) || "?"}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            <span className="block truncate text-xs font-medium text-slate-800">
                              {displayName}
                            </span>
                            <span className="block truncate text-[11px] text-slate-400">
                              {person.email}
                            </span>
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleQuickAddSingle(person.memberId)}
                          className="px-2 py-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded cursor-pointer transition-colors shrink-0"
                        >
                          + Thêm
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedForAdd.length > 0 && (
                <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600 font-medium pl-1">
                    Đã chọn: <strong>{selectedForAdd.length}</strong> nhân sự
                  </span>
                  <button
                    type="button"
                    onClick={handleAddSelected}
                    className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer border-none"
                  >
                    Thêm vào ca
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Quota Setter */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-50/70 border border-slate-200/80 rounded-md px-2.5 py-1">
          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Đặt hạn mức chung:
          </span>
          <input
            type="number"
            min={0}
            max={10000}
            value={bulkQuotaInput}
            onChange={(e) => setBulkQuotaInput(e.target.value)}
            className="w-16 h-7 rounded bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-1.5 text-center text-xs font-semibold tabular-nums text-slate-900 outline-none"
          />
          <button
            type="button"
            onClick={handleApplyBulkQuota}
            disabled={assignedStaff.length === 0}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline px-1 py-0.5 disabled:opacity-40 disabled:no-underline cursor-pointer transition-colors"
          >
            Áp dụng
          </button>
        </div>
      </div>

      {/* 2. In-Roster Filter Bar (hiển thị khi danh sách nhân sự > 5) */}
      {assignedStaff.length > 5 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 py-2 px-1 border-t border-slate-100">
          <div className="relative w-48 sm:w-56">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={inRosterSearch}
              onChange={(e) => setInRosterSearch(e.target.value)}
              placeholder="Lọc trong ca..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-slate-100/80 rounded-md border border-transparent focus:bg-white focus:border-blue-500 outline-none text-slate-800 placeholder:text-slate-400"
            />
            {inRosterSearch && (
              <button
                type="button"
                onClick={() => setInRosterSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "ALL", label: `Tất cả (${assignedStaff.length})` },
                { id: "MANAGER", label: `Ca trưởng (${managerCount})` },
                {
                  id: "MEMBER",
                  label: `Thành viên (${assignedStaff.length - managerCount})`,
                },
              ] as const
            ).map((item) => {
              const active = roleFilter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRoleFilter(item.id)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer border ${
                    active
                      ? "bg-blue-50 border-blue-600 text-blue-700 font-semibold shadow-2xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Assigned-Only Table with Sticky Header */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="max-h-[360px] overflow-y-auto">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white z-10 grid grid-cols-[minmax(0,1fr)_140px_130px_44px] gap-3 border-b border-slate-200 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-2xs">
            <span>Nhân viên trực ca ({assignedStaff.length})</span>
            <span>Hạn mức lead</span>
            <span>Vai trò trong ca</span>
            <span className="text-right">Bỏ</span>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100">
            {assignedStaff.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Users size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-700 m-0">
                  Chưa có nhân sự nào trong ca trực
                </p>
                <p className="text-xs text-slate-500 mt-1 mb-0 max-w-sm mx-auto">
                  Dùng thanh tìm kiếm phía trên để tìm và thêm nhân viên vào ca trực này.
                </p>
              </div>
            ) : displayedAssignedStaff.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <p className="text-xs text-slate-500 m-0">
                  Không tìm thấy nhân viên nào khớp với bộ lọc trong ca.
                </p>
              </div>
            ) : (
              displayedAssignedStaff.map((person) => {
                const selected = membersMap.get(person.memberId);
                const displayName = person.fullName?.trim() || person.email;
                const capacity = selected?.leadCapacity ?? 10;
                const isManager = Boolean(selected?.isShiftManager);

                return (
                  <div
                    id={`shift-member-${person.memberId}`}
                    key={person.memberId}
                    className={`grid grid-cols-[minmax(0,1fr)_140px_130px_44px] items-center gap-3 py-2.5 px-3 transition-colors hover:bg-slate-50/70 ${
                      focusMemberId === person.memberId ? "bg-blue-50/60" : ""
                    }`}
                  >
                    {/* Column 1: Nhân viên */}
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {getInitials(displayName) || "?"}
                      </span>
                      <div className="min-w-0 flex-1 truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs font-semibold text-slate-900">
                            {displayName}
                          </span>
                          {isManager && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
                              Ca trưởng
                            </span>
                          )}
                        </div>
                        <span className="block truncate text-[11px] text-slate-500">
                          {person.email}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Hạn mức Lead (Compact Soft-Filled Stepper: - [10] +) */}
                    <div>
                      <div className="inline-flex items-center h-8 p-0.5 bg-slate-100/80 rounded-md border border-transparent focus-within:bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition-all">
                        <button
                          type="button"
                          aria-label={`Giảm hạn mức của ${displayName}`}
                          disabled={capacity <= 0}
                          onClick={() =>
                            onPatchMember(person.memberId, {
                              leadCapacity: Math.max(0, capacity - 1),
                            })
                          }
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors select-none text-sm"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={10000}
                          step={1}
                          value={capacity}
                          aria-label={`Hạn mức lead của ${displayName}`}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (
                              Number.isInteger(val) &&
                              val >= 0 &&
                              val <= 10000
                            ) {
                              onPatchMember(person.memberId, {
                                leadCapacity: val,
                              });
                            }
                          }}
                          className="w-12 text-center bg-transparent border-none focus:ring-0 text-xs font-semibold tabular-nums text-slate-900 outline-none p-0"
                        />
                        <button
                          type="button"
                          aria-label={`Tăng hạn mức của ${displayName}`}
                          disabled={capacity >= 10000}
                          onClick={() =>
                            onPatchMember(person.memberId, {
                              leadCapacity: Math.min(10000, capacity + 1),
                            })
                          }
                          className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer transition-colors select-none text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Column 3: Vai trò trong ca (Standard Checkbox + static "Ca trưởng" label) */}
                    <div>
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isManager}
                          onChange={(e) =>
                            onPatchMember(person.memberId, {
                              isShiftManager: e.target.checked,
                            })
                          }
                          aria-label={`Đặt ${displayName} làm ca trưởng`}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer shrink-0"
                        />
                        <span
                          className={`text-xs select-none transition-colors ${
                            isManager
                              ? "font-semibold text-slate-900"
                              : "text-slate-600"
                          }`}
                        >
                          Ca trưởng
                        </span>
                      </label>
                    </div>

                    {/* Column 4: Thao tác (Xóa khỏi ca) */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => onToggleStaff(person.memberId, false)}
                        aria-label={`Xóa ${displayName} khỏi ca trực`}
                        title={`Xóa ${displayName} khỏi ca trực`}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mt-2 text-center text-xs text-red-700">
          {loadError}
        </p>
      )}

      <p className="mb-0 mt-2 text-[11px] text-slate-500">
        Hạn mức 0 nghĩa là không nhận lead mới qua cơ chế phân bổ của ca.
      </p>
    </ShiftSection>
  );
};
