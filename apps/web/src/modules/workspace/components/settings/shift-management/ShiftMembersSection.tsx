import React, { useEffect, useRef } from "react";
import type { ManagedStaffItem } from "../../../types/staff.types.js";
import type { MemberDraft } from "./types.js";
import { ShiftSection } from "./ShiftSection.js";

type ActiveStaffMember = ManagedStaffItem & { memberId: string };

interface ShiftMembersSectionProps {
  staff: ActiveStaffMember[];
  members: MemberDraft[];
  loadError?: string;
  focusMemberId?: string;
  onToggleStaff: (workspaceMemberId: string, checked: boolean) => void;
  onPatchMember: (
    workspaceMemberId: string,
    patch: Partial<MemberDraft>,
  ) => void;
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
}) => {
  const memberToFocus = useRef<string | null>(null);
  const quotaInputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    const memberId = memberToFocus.current;
    if (!memberId) return;
    quotaInputs.current.get(memberId)?.focus();
    memberToFocus.current = null;
  }, [members]);

  return (
    <ShiftSection
      id="shift-members-section"
      title="Nhân sự và hạn mức"
      description="Chọn nhân viên trực trong ca, thiết lập số lead và quyền ca trưởng."
    >
      <div className="hidden grid-cols-[minmax(0,1fr)_190px_120px] gap-3 border-b border-slate-100 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid">
        <span>Nhân viên</span>
        <span>Hạn mức lead</span>
        <span>Vai trò</span>
      </div>
      <div className="divide-y divide-slate-100">
        {staff.map((person) => {
          const selected = members.find(
            (item) => item.workspaceMemberId === person.memberId,
          );
          const displayName = person.fullName?.trim() || person.email;
          const capacity = selected?.leadCapacity ?? 10;
          const isDisabled = !selected;
          return (
            <div
              id={`shift-member-${person.memberId}`}
              key={person.memberId}
              className={`grid items-center gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_190px_120px] ${
                focusMemberId === person.memberId
                  ? "scroll-mt-24 rounded-lg bg-blue-50/60 px-2"
                  : ""
              }`}
            >
              <label className="flex min-w-0 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={Boolean(selected)}
                  onChange={(event) => {
                    if (event.target.checked)
                      memberToFocus.current = person.memberId;
                    onToggleStaff(person.memberId, event.target.checked);
                  }}
                  aria-label={`Phân công ${displayName} vào ca`}
                  className="size-4 shrink-0 accent-blue-600"
                />
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                  {getInitials(displayName) || "?"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {displayName}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {person.email}
                  </span>
                </span>
              </label>

              <div>
                <span className="mb-1 block text-[10px] font-medium text-slate-500 sm:hidden">
                  Hạn mức lead
                </span>
                <div
                  className={`flex h-9 items-center overflow-hidden rounded-lg border ${
                    isDisabled
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-300"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Giảm hạn mức của ${displayName}`}
                    disabled={isDisabled || capacity <= 0}
                    onClick={() =>
                      onPatchMember(person.memberId, {
                        leadCapacity: Math.max(0, capacity - 1),
                      })
                    }
                    className="h-full w-9 border-r border-slate-200 text-base text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    −
                  </button>
                  <input
                    ref={(element) => {
                      if (element)
                        quotaInputs.current.set(person.memberId, element);
                      else quotaInputs.current.delete(person.memberId);
                    }}
                    aria-label={`Hạn mức lead của ${displayName}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={10000}
                    step={1}
                    value={capacity}
                    disabled={isDisabled}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (
                        Number.isInteger(value) &&
                        value >= 0 &&
                        value <= 10000
                      ) {
                        onPatchMember(person.memberId, { leadCapacity: value });
                      }
                    }}
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200 disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    aria-label={`Tăng hạn mức của ${displayName}`}
                    disabled={isDisabled || capacity >= 10000}
                    onClick={() =>
                      onPatchMember(person.memberId, {
                        leadCapacity: Math.min(10000, capacity + 1),
                      })
                    }
                    className="h-full w-9 border-l border-slate-200 text-base text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-start">
                <span className="text-xs text-slate-600 sm:hidden">
                  Ca trưởng
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(selected?.isShiftManager)}
                  aria-label={`Đặt ${displayName} làm ca trưởng`}
                  disabled={isDisabled}
                  onClick={() =>
                    onPatchMember(person.memberId, {
                      isShiftManager: !selected?.isShiftManager,
                    })
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected?.isShiftManager ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      selected?.isShiftManager
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
        {loadError ? (
          <p role="alert" className="py-6 text-center text-sm text-red-700">
            {loadError}
          </p>
        ) : (
          !staff.length && (
            <p className="py-6 text-center text-sm text-slate-500">
              Workspace chưa có nhân viên đang hoạt động.
            </p>
          )
        )}
      </div>
      <p className="mb-0 mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
        Hạn mức 0 nghĩa là không nhận lead mới qua cơ chế phân bổ của ca.
      </p>
    </ShiftSection>
  );
};
