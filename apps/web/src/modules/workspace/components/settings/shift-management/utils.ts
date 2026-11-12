export const toLocalDateTimeValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const normalizeShiftTimeInput = (value: string): string | null => {
  const trimmed = value.trim();
  const match = /^(\d{1,2}):?(\d{0,2})$/.exec(trimmed);
  if (!match || !match[1]) return null;

  const digits = trimmed.replace(":", "");
  const hourDigits =
    trimmed.includes(":") || digits.length <= 2
      ? match[1]
      : digits.slice(0, digits.length - 2);
  const minuteDigits = trimmed.includes(":")
    ? match[2]
    : digits.length <= 2
      ? ""
      : digits.slice(-2);
  const hours = Number(hourDigits);
  const minutes = minuteDigits ? Number(minuteDigits) : 0;
  if (hours > 23 || minutes > 59) return null;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export const formatShiftTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;
};

export type AuditDateRange = "TODAY" | "YESTERDAY" | "THIS_WEEK" | "CUSTOM";

const formatDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const addCalendarDays = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  return formatDate(new Date(Date.UTC(year, month - 1, day + days)));
};

export const getDateInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};

const getUtcAtZonedMidnight = (date: string, timeZone: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const targetWallTime = Date.UTC(year, month - 1, day);
  let timestamp = targetWallTime;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(
      parts.map((part) => [part.type, Number(part.value)]),
    );
    const representedWallTime = Date.UTC(
      values.year,
      values.month - 1,
      values.day,
      values.hour,
      values.minute,
      values.second,
    );
    const correction = targetWallTime - representedWallTime;
    timestamp += correction;
    if (correction === 0) break;
  }

  return new Date(timestamp).toISOString();
};

export const getAuditDateBounds = (
  range: AuditDateRange,
  timeZone: string,
  now = new Date(),
  customStart?: string,
  customEnd?: string,
) => {
  let startDate: string;
  let lastDate: string;

  if (range === "CUSTOM") {
    if (!customStart || !customEnd || customStart > customEnd) return null;
    startDate = customStart;
    lastDate = customEnd;
  } else {
    const today = getDateInTimeZone(now, timeZone);
    if (range === "TODAY") {
      startDate = today;
      lastDate = today;
    } else if (range === "YESTERDAY") {
      startDate = addCalendarDays(today, -1);
      lastDate = startDate;
    } else {
      const [year, month, day] = today.split("-").map(Number);
      const daysSinceMonday =
        (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
      startDate = addCalendarDays(today, -daysSinceMonday);
      lastDate = today;
    }
  }

  return {
    startAt: getUtcAtZonedMidnight(startDate, timeZone),
    endAt: getUtcAtZonedMidnight(addCalendarDays(lastDate, 1), timeZone),
  };
};
