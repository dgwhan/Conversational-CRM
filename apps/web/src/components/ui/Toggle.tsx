import React, { type ReactNode } from "react";

export interface ToggleProps {
  /** Trạng thái bật / tắt */
  checked: boolean;
  /** Hàm callback khi thay đổi trạng thái */
  onChange: (checked: boolean) => void;
  /** Vô hiệu hóa toggle */
  disabled?: boolean;
  /** Nhãn chữ tùy biến bên cạnh */
  children?: ReactNode;
  /** Nhãn hiển thị khi bật (nếu không truyền children) */
  labelOn?: string;
  /** Nhãn hiển thị khi tắt (nếu không truyền children) */
  labelOff?: string;
  /** Hiển thị nhãn trạng thái labelOn / labelOff bên cạnh switch */
  showStatusLabel?: boolean;
  /** Kích thước switch ('sm' | 'md' | 'lg') */
  size?: "sm" | "md" | "lg";
  /** Thuộc tính tiêu đề tooltip */
  title?: string;
  /** ID phần tử */
  id?: string;
  /** Thuộc tính aria-label */
  "aria-label"?: string;
  /** Class CSS tùy biến */
  className?: string;
}

/**
 * Component Switch Toggle dùng chung cho toàn bộ hệ thống.
 * Thiết kế đồng bộ màu xanh dương chuẩn (indigo-600), ô tròn màu trắng tinh khiết,
 * thanh ray hiển thị sắc nét cả khi bật và tắt (không bị mờ đục).
 */
export function Toggle({
  checked,
  onChange,
  disabled = false,
  children,
  labelOn = "Đang bật",
  labelOff = "Tạm tắt",
  showStatusLabel = false,
  size = "md",
  title,
  id,
  "aria-label": ariaLabel,
  className = "",
}: ToggleProps) {
  const sizeClasses = {
    sm: {
      track: "w-8 h-4.5",
      thumb: "size-3.5",
      translate: "peer-checked:translate-x-3.5",
    },
    md: {
      track: "w-9 h-5",
      thumb: "size-4",
      translate: "peer-checked:translate-x-4",
    },
    lg: {
      track: "w-11 h-6",
      thumb: "size-5",
      translate: "peer-checked:translate-x-5",
    },
  }[size];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      title={title}
      className={`inline-flex items-center gap-2.5 select-none font-sans text-xs sm:text-sm ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      } ${className}`.trim()}
    >
      <div className="relative inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          id={id}
          aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
          checked={checked}
          onChange={(e) => {
            if (disabled) return;
            onChange(e.target.checked);
          }}
          disabled={disabled}
          onKeyDown={handleKeyDown}
          className="peer sr-only"
        />
        {/* Track: Màu sắc đậm đà rõ nét, không dùng opacity mờ đục */}
        <div
          className={`${sizeClasses.track} rounded-full bg-slate-300 peer-checked:bg-indigo-600 transition-colors duration-200 ease-in-out peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/40 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        />
        {/* Thumb: Nút trượt tròn luôn giữ màu trắng tinh khiết 100% (#ffffff) sắc nét */}
        <span
          className={`pointer-events-none absolute left-[2px] inline-block ${sizeClasses.thumb} rounded-full bg-white shadow-xs border border-black/5 transition-transform duration-200 ease-in-out translate-x-0 ${sizeClasses.translate}`}
          style={{ backgroundColor: "#ffffff" }}
        />
      </div>

      {children ? (
        <span className={disabled ? "text-slate-500" : "text-slate-700 font-medium"}>
          {children}
        </span>
      ) : showStatusLabel ? (
        <span
          className={`font-semibold ${
            checked ? "text-slate-800" : "text-slate-500"
          }`}
        >
          {checked ? labelOn : labelOff}
        </span>
      ) : null}
    </label>
  );
}

export const ToggleSwitch = Toggle;
