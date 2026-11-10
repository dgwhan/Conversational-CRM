export interface DayWorkingSchedule {
  dayOfWeek: number; // 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7, 0/7: CN
  dayName: string;
  isOpen: boolean;
  openTime: string; // "07:00"
  closeTime: string; // "17:00"
}

export interface WorkingHoursConfig {
  enabled: boolean;
  timezone: string;
  schedules: DayWorkingSchedule[];
  autoReplyMessage: string;
  outOfOfficeTag: string;
  cooldownMinutes: number;
}

export function getDefaultWorkingHoursConfig(): WorkingHoursConfig {
  return {
    enabled: true,
    timezone: 'Asia/Ho_Chi_Minh',
    schedules: [
      { dayOfWeek: 1, dayName: 'Thứ Hai', isOpen: true, openTime: '07:00', closeTime: '17:00' },
      { dayOfWeek: 2, dayName: 'Thứ Ba', isOpen: true, openTime: '07:00', closeTime: '17:00' },
      { dayOfWeek: 3, dayName: 'Thứ Tư', isOpen: true, openTime: '07:00', closeTime: '17:00' },
      { dayOfWeek: 4, dayName: 'Thứ Năm', isOpen: true, openTime: '07:00', closeTime: '17:00' },
      { dayOfWeek: 5, dayName: 'Thứ Sáu', isOpen: true, openTime: '07:00', closeTime: '17:00' },
      { dayOfWeek: 6, dayName: 'Thứ Bảy', isOpen: false, openTime: '07:00', closeTime: '12:00' },
      { dayOfWeek: 7, dayName: 'Chủ Nhật', isOpen: false, openTime: '07:00', closeTime: '12:00' },
    ],
    autoReplyMessage:
      'Cảm ơn bạn đã liên hệ! Hiện tại đang ngoài khung giờ làm việc của chúng tôi (Thứ 2 - Thứ 6: 07:00 - 17:00). Chúng tôi đã ghi nhận tin nhắn và tư vấn viên sẽ liên hệ lại với bạn ngay vào đầu giờ làm việc tiếp theo. Chúc bạn một ngày tốt lành!',
    outOfOfficeTag: 'HẸN TƯ VẤN SÁNG HÔM SAU',
    cooldownMinutes: 60,
  };
}

