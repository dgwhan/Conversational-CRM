import React, { useState } from "react";
import { Button } from "../../../../../../../components/ui/index.js";
import type {
  MemberHandoverDialogProps,
  MemberHandoverMode,
} from "./types.js";

export const MemberLeadLockDialog: React.FC<MemberHandoverDialogProps> = ({
  member,
  roster,
  isSubmitting,
  onCancel,
  onSubmit,
}) => {
  const [mode, setMode] = useState<MemberHandoverMode>("QUEUE");
  const [targetId, setTargetId] = useState("");
  const selectedTarget = roster.find(
    (row) => row.workspaceMemberId === targetId,
  );
  const targetOverCapacity =
    selectedTarget &&
    selectedTarget.openConversations >= selectedTarget.effectiveCapacity;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-member-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
        <h3
          id="lock-member-title"
          className="m-0 text-base font-bold text-slate-900"
        >
          Khóa nhận lead và bàn giao
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          {member.fullName || member.email} sẽ dừng nhận lead mới. Chọn cách xử
          lý các hội thoại đang mở.
        </p>
        <label className="mt-4 block text-xs font-semibold text-slate-700">
          Cách bàn giao
          <select
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as MemberHandoverMode);
              setTargetId("");
            }}
            className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
          >
            <option value="QUEUE">Đưa vào hàng chờ đội</option>
            <option value="TRANSFER">Chuyển cho nhân viên đang trực</option>
          </select>
        </label>
        {mode === "TRANSFER" && (
          <label className="mt-3 block text-xs font-semibold text-slate-700">
            Người nhận
            <select
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
            >
              <option value="">Chọn nhân viên đang trực</option>
              {roster
                .filter(
                  (row) =>
                    row.isEligible && row.workspaceMemberId !== member.memberId,
                )
                .map((row) => (
                  <option
                    key={row.workspaceMemberId}
                    value={row.workspaceMemberId}
                  >
                    {row.fullName} · {row.openConversations}/
                    {row.effectiveCapacity}
                  </option>
                ))}
            </select>
            {targetOverCapacity && (
              <span className="mt-1 block text-amber-800">
                Người nhận sẽ vượt hạn mức hiện tại. Đây là cảnh báo thông tin;
                vẫn có thể tiếp tục.
              </span>
            )}
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={isSubmitting || (mode === "TRANSFER" && !targetId)}
            onClick={() => onSubmit(mode, targetId || undefined)}
          >
            Khóa và bàn giao
          </Button>
        </div>
      </div>
    </div>
  );
};
