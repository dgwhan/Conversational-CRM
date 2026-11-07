/**
 * Tiện ích xử lý múi giờ và ngày tháng theo giờ địa phương (GMT+7 Việt Nam)
 * Giải quyết triệt để vấn đề lệch ngày giữa UTC trong cơ sở dữ liệu và giờ hiển thị của người dùng
 */

/**
 * Chuyển đổi Date object hoặc ISO string thành chuỗi "YYYY-MM-DD" theo giờ ĐỊA PHƯƠNG.
 * Tuyệt đối không dùng .toISOString().split('T')[0] vì sẽ bị lệch lùi 1 ngày tại GMT+7.
 */
export function formatLocalDate(date?: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Lấy giờ địa phương định dạng "HH:mm" (24h).
 */
export function formatLocalTime(date?: Date | string | null): string {
  if (!date) return '09:00';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '09:00';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Tạo Date object từ chuỗi ngày (YYYY-MM-DD) và giờ (HH:mm) theo giờ địa phương của trình duyệt.
 */
export function parseLocalDateTime(dateStr: string, timeStr: string = '00:00'): Date | null {
  if (!dateStr) return null;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minStr] = timeStr.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr || '0', 10);
  const minute = parseInt(minStr || '0', 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  return new Date(year, month, day, hour, minute, 0, 0);
}

/**
 * So sánh 2 ngày xem có cùng một ngày địa phương hay không.
 */
export function isSameLocalDate(date1?: Date | string | null, date2?: Date | string | null): boolean {
  if (!date1 || !date2) return false;
  return formatLocalDate(date1) === formatLocalDate(date2);
}
