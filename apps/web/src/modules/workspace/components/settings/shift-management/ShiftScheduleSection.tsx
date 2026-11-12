import React from "react";
import { TimeZonePicker } from "../TimeZonePicker.js";
import { ShiftSection } from "./ShiftSection.js";
import { ShiftTimeInput } from "./ShiftTimeInput.js";
import { WEEKDAY_LABELS } from "../../../hooks/useWorkspaceLeadRouting.js";
import { normalizeShiftTimeInput } from "./utils.js";

interface ShiftScheduleSectionProps {
  name: string;
  startTime: string;
  endTime: string;
  timezone: string;
  weekdays: number[];
  disabled: boolean;
  onNameChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onWeekdaysChange: (value: number[]) => void;
}

function getDuration(startTime: string, endTime: string) {
  const start = normalizeShiftTimeInput(startTime);
  const end = normalizeShiftTimeInput(endTime);
  if (!start || !end) return null;

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  if (endMinutes === startMinutes) {
    return { overnight: false, totalMinutes: 0, sameTime: true };
  }
  const overnight = endMinutes < startMinutes;
  const totalMinutes =
    endMinutes >= startMinutes
      ? endMinutes - startMinutes
      : 24 * 60 - startMinutes + endMinutes;

  return { overnight, totalMinutes, sameTime: false };
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `${hours} tiếng`;
  if (hours === 0) return `${minutes} phút`;
  return `${hours} tiếng ${minutes} phút`;
}

export const ShiftScheduleSection: React.FC<ShiftScheduleSectionProps> = ({
  name,
  startTime,
  endTime,
  timezone,
  weekdays,
  disabled,
  onNameChange,
  onStartTimeChange,
  onEndTimeChange,
  onTimezoneChange,
  onWeekdaysChange,
}) => {
  const duration = getDuration(startTime, endTime);

  return (
    <ShiftSection
      title="Thông tin ca"
      description="Cấu hình khung giờ và ngày áp dụng cho ca tư vấn."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-medium text-slate-700">
          Tên ca
          <input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            disabled={disabled}
            maxLength={120}
            required
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50"
          />
        </label>
        <div>
          <span className="text-xs font-medium text-slate-700">Múi giờ</span>
          <TimeZonePicker
            value={timezone}
            onChange={onTimezoneChange}
            disabled={disabled}
          />
        </div>
        <ShiftTimeInput
          label="Bắt đầu"
          value={startTime}
          onChange={onStartTimeChange}
          disabled={disabled}
        />
        <div>
          <ShiftTimeInput
            label="Kết thúc"
            value={endTime}
            onChange={onEndTimeChange}
            disabled={disabled}
          />
          {duration?.sameTime ? (
            <span className="mt-1.5 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              Giờ kết thúc cần khác giờ bắt đầu
            </span>
          ) : (
            duration && (
              <span className="mt-1.5 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">
                {duration.overnight ? "Ca qua đêm · " : ""}
                {formatDuration(duration.totalMinutes)}
              </span>
            )
          )}
        </div>
        <div className="md:col-span-2">
          <span className="text-xs font-medium text-slate-700">
            Ngày áp dụng
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, day) => {
              const isSelected = weekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={disabled}
                  onClick={() =>
                    onWeekdaysChange(
                      isSelected
                        ? weekdays.filter((item) => item !== day)
                        : [...weekdays, day].sort(),
                    )
                  }
                  className={`min-w-11 rounded-full border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ShiftSection>
  );
};
