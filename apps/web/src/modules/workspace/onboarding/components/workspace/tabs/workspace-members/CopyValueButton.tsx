import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { notify } from "../../../../../../../components/feedback/toastEmitter.js";
import type { CopyValueButtonProps } from "./types.js";

export const CopyValueButton: React.FC<CopyValueButtonProps> = ({
  value,
  label,
}) => {
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    if (!navigator.clipboard?.writeText) {
      notify.error("Trình duyệt không hỗ trợ sao chép.");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error(`Không thể sao chép ${label.toLocaleLowerCase("vi")}.`);
    }
  };

  return (
    <button
      type="button"
      aria-label={`Sao chép ${label}`}
      title={`Sao chép ${label}`}
      onClick={() => void copyValue()}
      className="shrink-0 rounded p-1 text-slate-400 opacity-100 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:opacity-0 sm:group-hover:opacity-100"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
};
