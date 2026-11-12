import React from "react";
import { formatShiftTimeInput, normalizeShiftTimeInput } from "./utils.js";

interface ShiftTimeInputProps {
  label: string;
  value: string;
  disabled: boolean;
  helperText?: string;
  onChange: (value: string) => void;
}

export const ShiftTimeInput: React.FC<ShiftTimeInputProps> = ({
  label,
  value,
  disabled,
  helperText,
  onChange,
}) => (
  <label className="text-xs font-medium text-slate-700">
    {label}
    <input
      type="text"
      inputMode="numeric"
      placeholder="08:00"
      value={value}
      onChange={(event) => onChange(formatShiftTimeInput(event.target.value))}
      onBlur={(event) => {
        const normalized = normalizeShiftTimeInput(event.target.value);
        if (normalized) onChange(normalized);
      }}
      disabled={disabled}
      maxLength={5}
      className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-3 text-sm"
    />
    {helperText && (
      <span className="mt-1 block text-[11px] text-slate-500">
        {helperText}
      </span>
    )}
  </label>
);
