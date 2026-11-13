const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
  if (!TIME_RE.test(shift.startTime) || !TIME_RE.test(shift.endTime)) {
    return false;
  }

  const currentDayInZone = new Intl.DateTimeFormat('en-US', {
    timeZone: shift.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);

  const parts = Object.fromEntries(
    currentDayInZone
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as {
    weekday?: string;
    hour?: string;
    minute?: string;
  };

  const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentWeekday = weekdayMap.indexOf(parts.weekday ?? '');

  if (currentWeekday === -1) {
    return false;
  }

  const normalizedWeekdays = shift.weekdays.map((day) => {
    const value = Number(day);
    if (Number.isNaN(value)) {
      return -1;
    }

    const normalized = value % 7;
    return normalized === 0 && value !== 0 ? 0 : normalized;
  });

  if (!normalizedWeekdays.includes(currentWeekday)) {
    return false;
  }

  const currentMinutes = timeToMinutes(`${parts.hour ?? '00'}:${parts.minute ?? '00'}`);
  const startMinutes = timeToMinutes(shift.startTime);
  const endMinutes = timeToMinutes(shift.endTime);

  if (startMinutes === endMinutes) {
    return true;
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}