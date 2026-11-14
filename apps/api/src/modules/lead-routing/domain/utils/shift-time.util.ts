export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function shiftIsActive(
  shift: {
    startTime: string;
    endTime: string;
    timezone: string;
    weekdays: number[];
  },
  instant: Date,
): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: shift.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = weekdayMap[values.weekday];
  const current = Number(values.hour) * 60 + Number(values.minute);
  const start = timeToMinutes(shift.startTime);
  const end = timeToMinutes(shift.endTime);
  if (start < end)
    return shift.weekdays.includes(day) && current >= start && current < end;
  if (current >= start) return shift.weekdays.includes(day);
  if (current < end) return shift.weekdays.includes((day + 6) % 7);
  return false;
}

