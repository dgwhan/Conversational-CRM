import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, type ActivityItem } from '../../../lib/api-client/index.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { isSameLocalDate } from '../../calendar/utils/dateTimeUtils.js';

/**
 * Phát âm thanh chuông thông báo nhẹ nhàng và hiện đại sử dụng Web Audio API
 */
export function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Âm nốt 1 (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Âm nốt 2 (G#5 - 830.61 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.7);

    // Âm nốt 3 (B5 - 987.77 Hz) kết thúc vang
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.25);
    gain3.gain.setValueAtTime(0.2, now + 0.25);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.25);
    osc3.stop(now + 1.2);
  } catch {}
}

export function useActivityReminders(workspaceId?: string) {
  const [dueActivities, setDueActivities] = useState<ActivityItem[]>([]);
  const [todayTasksCount, setTodayTasksCount] = useState<number>(0);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Xin quyền Browser Notification một cách thân thiện
  const requestBrowserPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {}
      }
    }
  }, []);

  const checkReminders = useCallback(async () => {
    try {
      const items = await apiClient.getDueReminders(workspaceId);
      setDueActivities(items);

      // Tính số nhiệm vụ hôm nay theo giờ địa phương
      const count = items.filter((a) => {
        const time = a.dueAt || a.scheduledAt;
        return isSameLocalDate(time, new Date()) && a.status === 'PENDING';
      }).length;
      setTodayTasksCount(count);

      // Kích hoạt cảnh báo cho các hoạt động sắp đến giờ hoặc vừa đến giờ
      for (const item of items) {
        if (!notifiedIdsRef.current.has(item.id)) {
          notifiedIdsRef.current.add(item.id);

          // Phát âm thanh
          playChimeSound();

          const label = item.type === 'CALL' ? 'Nhắc gọi điện' : (item.type === 'MEETING' ? 'Lịch hẹn' : 'Công việc đến hạn');
          const timeStr = item.scheduledAt
            ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : (item.dueAt ? new Date(item.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ngay bây giờ');

          // Hiển thị Toast
          notify.info(
            `[${label} lúc ${timeStr}] ${item.title}${item.customer?.fullName ? ` - Ứng viên: ${item.customer.fullName}` : ''}`,
            `Nhắc việc CUSC CRM`
          );

          // Phát Browser Notification nếu người dùng cho phép
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`CUSC CRM: ${label} [${timeStr}]`, {
                body: `${item.title} - ${item.customer?.fullName || item.assignedTo || 'Nhiệm vụ'}`,
                icon: '/favicon.svg',
              });
            } catch {}
          }
        }
      }
    } catch {}
  }, [workspaceId]);

  useEffect(() => {
    checkReminders();
    // Kiểm tra định kỳ mỗi 45 giây
    const interval = setInterval(checkReminders, 45000);
    return () => clearInterval(interval);
  }, [checkReminders]);

  return {
    dueActivities,
    todayTasksCount,
    checkReminders,
    requestBrowserPermission,
    playChimeSound,
  };
}
