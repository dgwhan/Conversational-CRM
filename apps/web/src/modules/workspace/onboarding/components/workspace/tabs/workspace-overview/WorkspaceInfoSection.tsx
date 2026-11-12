import React, { useEffect, useRef, useState } from "react";
import { Check, Edit2, Loader2, X } from "lucide-react";
import { Button, PageSection } from "../../../../../../../components/ui/index.js";
import type { WorkspaceInfoSectionProps } from "./types.js";

export const WorkspaceInfoSection: React.FC<WorkspaceInfoSectionProps> = ({
  workspace,
  domainLabel,
  adminName,
  canManageWorkspace,
  onEditWorkspace,
  onSaveWorkspaceName,
}) => {
  const [isEditingNameInline, setIsEditingNameInline] = useState(false);
  const [nameInputValue, setNameInputValue] = useState(workspace.name);
  const [isSavingName, setIsSavingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameInputValue(workspace.name);
  }, [workspace.name]);

  useEffect(() => {
    if (isEditingNameInline) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingNameInline]);

  const handleSaveInlineName = async () => {
    const trimmed = nameInputValue.trim();
    if (!trimmed) return;
    if (trimmed === workspace.name) {
      setIsEditingNameInline(false);
      return;
    }
    if (onSaveWorkspaceName) {
      setIsSavingName(true);
      try {
        await onSaveWorkspaceName(trimmed);
        setIsEditingNameInline(false);
      } finally {
        setIsSavingName(false);
      }
    } else if (onEditWorkspace) {
      onEditWorkspace();
      setIsEditingNameInline(false);
    }
  };

  return (
    <PageSection
      title="Thông tin chung"
      className="pb-4"
      actions={
        canManageWorkspace && onEditWorkspace ? (
          <Button
            variant="outline"
            size="sm"
            icon={<Edit2 size={13} />}
            onClick={onEditWorkspace}
          >
            Sửa thông tin
          </Button>
        ) : undefined
      }
    >
      <div className="border border-slate-200 rounded-lg bg-white px-4 sm:px-5 divide-y divide-slate-100 shadow-2xs text-xs sm:text-sm">
        <div className="py-3.5 px-1 flex items-center justify-between gap-4">
          <span className="text-slate-500 shrink-0">Tên không gian làm việc</span>
          {isEditingNameInline ? (
            <div className="flex items-center gap-1.5 max-w-sm w-full justify-end">
              <input
                ref={nameInputRef}
                type="text"
                value={nameInputValue}
                onChange={(event) => setNameInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleSaveInlineName();
                  if (event.key === "Escape") setIsEditingNameInline(false);
                }}
                disabled={isSavingName}
                className="px-3 py-1.5 text-xs border border-blue-500 outline-none rounded-md w-full bg-white font-semibold text-slate-900 shadow-xs focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => void handleSaveInlineName()}
                disabled={isSavingName}
                className="w-7 h-7 flex items-center justify-center text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer border-none shrink-0 transition-colors"
                title="Lưu (Enter)"
              >
                {isSavingName ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Check size={13} />
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingNameInline(false)}
                disabled={isSavingName}
                className="w-7 h-7 flex items-center justify-center text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md cursor-pointer shrink-0 transition-colors"
                title="Hủy (Esc)"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                onClick={
                  canManageWorkspace
                    ? () => setIsEditingNameInline(true)
                    : undefined
                }
                className={`font-semibold text-slate-900 ${canManageWorkspace ? "cursor-pointer hover:text-blue-600 transition-colors" : ""}`}
                title={
                  canManageWorkspace
                    ? "Nhấn để sửa tên trực tiếp trên dòng này"
                    : undefined
                }
              >
                {workspace.name}
              </span>
              {canManageWorkspace && (
                <button
                  type="button"
                  onClick={() => setIsEditingNameInline(true)}
                  title="Chỉnh sửa tên trực tiếp trên dòng này"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer border-none bg-transparent"
                >
                  <Edit2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="py-3.5 px-1 flex items-center justify-between">
          <span className="text-slate-500">Lĩnh vực / Ngành nghề</span>
          <span className="font-semibold text-slate-900">{domainLabel}</span>
        </div>
        <div className="py-3 flex items-center justify-between">
          <span className="text-slate-500">Người quản trị</span>
          <span className="font-semibold text-slate-900">
            {(adminName && adminName !== "Chính bạn" ? adminName : "") ||
              (workspace.ownerName && workspace.ownerName !== "Chính bạn"
                ? workspace.ownerName
                : "") ||
              "Chủ sở hữu"}
          </span>
        </div>
        <div className="py-3 flex items-center justify-between">
          <span className="text-slate-500">Quyền hạn tài khoản</span>
          <span className="font-semibold text-slate-900">
            {workspace.isOwner
              ? "Chủ sở hữu"
              : canManageWorkspace
                ? "Quản lý workspace"
                : "Nhân viên tư vấn"}
          </span>
        </div>
        <div className="py-3 flex items-center justify-between">
          <span className="text-slate-500">Mã ID hệ thống</span>
          <span className="font-mono text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80">
            {workspace.id}
          </span>
        </div>
      </div>
    </PageSection>
  );
};
