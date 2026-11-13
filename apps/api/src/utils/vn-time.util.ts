/**
 * Mốc thời gian theo giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7, không có giờ mùa hè), độc lập với
 * múi giờ của server. Server chạy UTC (Docker / cloud) mà dùng `new Date(y, m, d)` sẽ lệch 7 tiếng.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface VnDateParts {
  year: number;
  /** 0-11 như Date#getMonth */
  month: number;
  day: number;
}

/** Ngày hiện tại (hoặc của `at`) theo lịch Việt Nam. */
export function vnToday(at: Date = new Date()): VnDateParts {
  const shifted = new Date(at.getTime() + VN_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

/** Thời điểm tương ứng giờ đồng hồ Việt Nam; chấp nhận tràn ngày / tháng âm hoặc vượt (như Date.UTC). */
export function vnDate(year: number, month: number, day = 1, hour = 0): Date {
  return new Date(Date.UTC(year, month, day, hour) - VN_OFFSET_MS);
}

/** Nhãn "ngày/tháng" theo lịch Việt Nam. */
export function vnDayMonthLabel(at: Date): string {
  const { month, day } = vnToday(at);
  return `${day}/${month + 1}`;
}
