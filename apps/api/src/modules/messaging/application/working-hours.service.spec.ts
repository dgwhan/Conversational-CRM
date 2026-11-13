import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkingHoursService } from './working-hours.service.js';
import { getDefaultWorkingHoursConfig, WorkingHoursConfig } from '../../../contracts/workspace-config.js';
import { Channel, MessageDirection } from '../domain/channel.js';

describe('WorkingHoursService', () => {
  let service: WorkingHoursService;
  let mockPrisma: any;
  let mockRealtime: any;
  let mockWorkspaceConfigService: any;
  let mockDispatcher: any;

  beforeEach(() => {
    mockPrisma = {
      customer: {
        findFirst: vi.fn(),
      },
      conversation: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      message: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      channelAccount: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    mockRealtime = {
      broadcastNewMessage: vi.fn(),
    };

    mockWorkspaceConfigService = {
      getConfig: vi.fn(),
    };

    mockDispatcher = {
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
    };

    service = new WorkingHoursService(
      mockPrisma,
      mockRealtime,
      mockWorkspaceConfigService,
      mockDispatcher,
    );
  });

  describe('checkIsWorkingHour', () => {
    const config: WorkingHoursConfig = {
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
      autoReplyMessage: 'Auto reply text',
      outOfOfficeTag: 'HẸN TƯ VẤN SÁNG HÔM SAU',
      cooldownMinutes: 60,
    };

    it('trả về isWithinHours = true khi đang trong giờ làm việc (Thứ 4 lúc 09:30 sáng)', () => {
      // 2026-11-04 là Thứ Tư. Giờ UTC 02:30 -> Giờ VN (UTC+7) là 09:30
      const date = new Date('2026-11-04T02:30:00Z');
      const result = service.checkIsWorkingHour(date, config);
      expect(result.isWithinHours).toBe(true);
      expect(result.reason).toBe('WITHIN_HOURS');
      expect(result.dayOfWeek).toBe(3);
    });

    it('trả về isWithinHours = false khi sau giờ làm việc (Thứ 4 lúc 19:30 tối)', () => {
      // Giờ UTC 12:30 -> Giờ VN là 19:30
      const date = new Date('2026-11-04T12:30:00Z');
      const result = service.checkIsWorkingHour(date, config);
      expect(result.isWithinHours).toBe(false);
      expect(result.reason).toBe('AFTER_CLOSE');
    });

    it('trả về isWithinHours = false khi trước giờ làm việc (Thứ 4 lúc 05:30 sáng)', () => {
      // Giờ UTC 22:30 ngày 03 -> Giờ VN là 05:30 ngày 04
      const date = new Date('2026-11-03T22:30:00Z');
      const result = service.checkIsWorkingHour(date, config);
      expect(result.isWithinHours).toBe(false);
      expect(result.reason).toBe('BEFORE_OPEN');
    });

    it('trả về isWithinHours = false vào ngày nghỉ (Thứ 7 hoặc Chủ Nhật)', () => {
      // 2026-11-07 là Thứ 7. Giờ UTC 03:00 -> Giờ VN là 10:00 sáng
      const date = new Date('2026-11-07T03:00:00Z');
      const result = service.checkIsWorkingHour(date, config);
      expect(result.isWithinHours).toBe(false);
      expect(result.reason).toBe('CLOSED_TODAY');
    });

    it('coi đúng giờ đóng cửa (17:00) là ngoài giờ', () => {
      // 10:00 UTC -> 17:00 giờ VN, Thứ Tư
      const result = service.checkIsWorkingHour(new Date('2026-11-04T10:00:00Z'), config);
      expect(result.isWithinHours).toBe(false);
      expect(result.reason).toBe('AFTER_CLOSE');
    });

    it('hỗ trợ ca qua đêm (22:00 -> 06:00)', () => {
      const nightConfig: WorkingHoursConfig = {
        ...config,
        schedules: [{ dayOfWeek: 3, dayName: 'Thứ Tư', isOpen: true, openTime: '22:00', closeTime: '06:00' }],
      };
      // 23:30 VN Thứ Tư -> trong giờ
      expect(service.checkIsWorkingHour(new Date('2026-11-04T16:30:00Z'), nightConfig).isWithinHours).toBe(true);
      // 12:00 VN Thứ Tư -> ngoài giờ
      expect(service.checkIsWorkingHour(new Date('2026-11-04T05:00:00Z'), nightConfig).isWithinHours).toBe(false);
    });

    it('trả về isWithinHours = true nếu tính năng bị vô hiệu hóa (enabled: false)', () => {
      const disabledConfig = { ...config, enabled: false };
      const date = new Date('2026-11-07T03:00:00Z'); // Thứ Bảy
      const result = service.checkIsWorkingHour(date, disabledConfig);
      expect(result.isWithinHours).toBe(true);
      expect(result.reason).toBe('DISABLED');
    });
  });

  describe('processInboundOutOfOffice', () => {
    const wednesdayConfig = {
      workingHours: {
        enabled: true,
        timezone: 'Asia/Ho_Chi_Minh',
        schedules: [{ dayOfWeek: 3, dayName: 'Thứ Tư', isOpen: true, openTime: '07:00', closeTime: '17:00' }],
        autoReplyMessage: 'Cảm ơn bạn đã nhắn tin ngoài giờ.',
        outOfOfficeTag: 'HẸN TƯ VẤN SÁNG HÔM SAU',
        cooldownMinutes: 60,
      },
    };
    const CONV_ID = 'c0000000-0000-0000-0000-000000000123';

    beforeEach(() => {
      // Các tin trong test được gửi vào ngày cố định -> đặt "bây giờ" ngay sau thời điểm gửi
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-05T13:31:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('bỏ qua tin cũ (đồng bộ lịch sử) – không gắn tag, không gửi auto-reply', async () => {
      mockWorkspaceConfigService.getConfig.mockResolvedValue(wednesdayConfig);
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: CONV_ID, tags: [], channelAccountId: 'acc-1' });

      await service.processInboundOutOfOffice({
        messageId: 'old-msg',
        conversationId: CONV_ID,
        channel: Channel.FACEBOOK,
        senderExternalId: 'customer-fb-1',
        channelAccountId: 'acc-1',
        sentAt: new Date('2026-11-04T13:00:00Z'), // hơn 1 ngày trước
      });

      expect(mockPrisma.conversation.update).not.toHaveBeenCalled();
      expect(mockDispatcher.sendMessage).not.toHaveBeenCalled();
    });

    it('khách gửi dồn nhiều tin cùng lúc chỉ nhận MỘT tin auto-reply', async () => {
      vi.setSystemTime(new Date('2026-11-04T13:01:00Z'));
      mockWorkspaceConfigService.getConfig.mockResolvedValue(wednesdayConfig);
      mockPrisma.conversation.findUnique.mockResolvedValue({ id: CONV_ID, tags: [], channelAccountId: 'acc-1' });
      mockPrisma.conversation.update.mockResolvedValue({ id: CONV_ID, tags: ['HẸN TƯ VẤN SÁNG HÔM SAU'] });

      // Mô phỏng DB: sau khi dispatcher gửi xong thì tin auto-reply đã tồn tại
      let sent = false;
      mockPrisma.message.findFirst.mockImplementation(async () => (sent ? { id: 'auto' } : null));
      mockDispatcher.sendMessage.mockImplementation(async () => {
        await new Promise((r) => setTimeout(r, 5));
        sent = true;
        return { success: true };
      });

      const base = {
        conversationId: CONV_ID,
        channel: Channel.FACEBOOK,
        senderExternalId: 'customer-fb-1',
        channelAccountId: 'acc-1',
        sentAt: new Date('2026-11-04T13:00:00Z'),
      };
      await Promise.all([
        service.processInboundOutOfOffice({ ...base, messageId: 'm1' }),
        service.processInboundOutOfOffice({ ...base, messageId: 'm2' }),
        service.processInboundOutOfOffice({ ...base, messageId: 'm3' }),
      ]);

      expect(mockDispatcher.sendMessage).toHaveBeenCalledTimes(1);
      // Dispatcher đã tự phát realtime -> service không broadcast thêm
      expect(mockRealtime.broadcastNewMessage).not.toHaveBeenCalled();
    });

    it('đánh dấu tag và gửi lời nhắn tự động khi nhận tin ngoài giờ', async () => {
      vi.setSystemTime(new Date('2026-11-04T13:01:00Z'));
      // Cấu hình workspace
      mockWorkspaceConfigService.getConfig.mockResolvedValue({
        workingHours: {
          enabled: true,
          timezone: 'Asia/Ho_Chi_Minh',
          schedules: [
            { dayOfWeek: 3, dayName: 'Thứ Tư', isOpen: true, openTime: '07:00', closeTime: '17:00' },
          ],
          autoReplyMessage: 'Cảm ơn bạn đã nhắn tin ngoài giờ.',
          outOfOfficeTag: 'HẸN TƯ VẤN SÁNG HÔM SAU',
          cooldownMinutes: 60,
        },
      });

      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'c0000000-0000-0000-0000-000000000123',
        tags: ['TAG_CU'],
        workspaceId: 'ws-1',
        channelAccountId: 'acc-1',
      });
      mockPrisma.conversation.update.mockResolvedValue({
        id: 'c0000000-0000-0000-0000-000000000123',
        tags: ['TAG_CU', 'HẸN TƯ VẤN SÁNG HÔM SAU'],
      });
      mockPrisma.message.findFirst.mockResolvedValue(null); // Chưa gửi auto reply trước đó

      // Tin nhắn gửi lúc 20:00 tối (ngoài giờ)
      const afterHoursDate = new Date('2026-11-04T13:00:00Z');

      await service.processInboundOutOfOffice({
        messageId: 'msg-1',
        conversationId: 'c0000000-0000-0000-0000-000000000123',
        channel: Channel.FACEBOOK,
        senderExternalId: 'customer-fb-1',
        channelAccountId: 'acc-1',
        sentAt: afterHoursDate,
      });

      // Kiểm tra gắn tag
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'c0000000-0000-0000-0000-000000000123' },
        data: { tags: ['TAG_CU', 'HẸN TƯ VẤN SÁNG HÔM SAU'] },
        select: expect.any(Object),
      });

      // Kiểm tra gửi tin nhắn tự động
      expect(mockDispatcher.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: Channel.FACEBOOK,
          recipientId: 'customer-fb-1',
          content: 'Cảm ơn bạn đã nhắn tin ngoài giờ.',
          conversationId: 'c0000000-0000-0000-0000-000000000123',
        }),
      );
    });

    it('không gửi tin lặp lại nếu đã gửi auto-reply trong khoảng thời gian cooldown', async () => {
      vi.setSystemTime(new Date('2026-11-04T13:01:00Z'));
      mockWorkspaceConfigService.getConfig.mockResolvedValue({
        workingHours: {
          enabled: true,
          timezone: 'Asia/Ho_Chi_Minh',
          schedules: [
            { dayOfWeek: 3, dayName: 'Thứ Tư', isOpen: true, openTime: '07:00', closeTime: '17:00' },
          ],
          autoReplyMessage: 'Cảm ơn bạn đã nhắn tin ngoài giờ.',
          outOfOfficeTag: 'HẸN TƯ VẤN SÁNG HÔM SAU',
          cooldownMinutes: 60,
        },
      });

      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: 'c0000000-0000-0000-0000-000000000123',
        tags: ['HẸN TƯ VẤN SÁNG HÔM SAU'],
        workspaceId: 'ws-1',
        channelAccountId: 'acc-1',
      });

      // Giả lập đã có tin auto reply gửi cách đây 5 phút
      mockPrisma.message.findFirst.mockResolvedValue({
        id: 'recent-auto-msg',
        content: 'Cảm ơn bạn đã nhắn tin ngoài giờ.',
      });

      const afterHoursDate = new Date('2026-11-04T13:00:00Z');

      await service.processInboundOutOfOffice({
        messageId: 'msg-2',
        conversationId: 'c0000000-0000-0000-0000-000000000123',
        channel: Channel.FACEBOOK,
        senderExternalId: 'customer-fb-1',
        channelAccountId: 'acc-1',
        sentAt: afterHoursDate,
      });

      // Không gọi sendMessage vì cooldown
      expect(mockDispatcher.sendMessage).not.toHaveBeenCalled();
    });

    it('tự động phân giải conversation và gửi auto-reply cho khách hàng Zalo khi conversationId dạng fallback', async () => {
      mockWorkspaceConfigService.getConfig.mockResolvedValue({
        workingHours: {
          enabled: true,
          timezone: 'Asia/Ho_Chi_Minh',
          schedules: [
            { dayOfWeek: 4, dayName: 'Thứ Năm', isOpen: true, openTime: '07:00', closeTime: '17:00' },
          ],
          autoReplyMessage: 'Cảm ơn Duong Ngoc Han đã nhắn tin ngoài giờ.',
          outOfOfficeTag: 'HẸN TƯ VẤN SÁNG HÔM SAU',
          cooldownMinutes: 60,
        },
      });

      mockPrisma.customer.findFirst = vi.fn().mockResolvedValue({
        id: 'cust-han-uuid',
        workspaceId: 'ws-1',
      });
      mockPrisma.conversation.findFirst = vi.fn().mockResolvedValue({
        id: 'c0000000-0000-0000-0000-000000000999',
        tags: [],
        workspaceId: 'ws-1',
        channelAccountId: 'zalo-acc-1',
      });
      mockPrisma.conversation.update = vi.fn().mockResolvedValue({
        id: 'c0000000-0000-0000-0000-000000000999',
        tags: ['HẸN TƯ VẤN SÁNG HÔM SAU'],
      });
      mockPrisma.message.findFirst = vi.fn().mockResolvedValue(null);

      // Tin nhắn gửi lúc 20:30 tối Thứ Năm
      const afterHoursDate = new Date('2026-11-05T13:30:00Z');

      await service.processInboundOutOfOffice({
        messageId: 'zalo-msg-han-1',
        conversationId: 'conv_duong_ngoc_han_zalo_id',
        channel: Channel.ZALO,
        senderExternalId: 'duong_ngoc_han_zalo_id',
        channelAccountId: 'zalo-acc-1',
        sentAt: afterHoursDate,
      });

      // Kiểm tra gắn tag cho cuộc hội thoại đã phân giải
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c0000000-0000-0000-0000-000000000999' },
          data: { tags: ['HẸN TƯ VẤN SÁNG HÔM SAU'] },
        }),
      );

      // Kiểm tra gửi tin nhắn tự động đến đúng recipient Zalo
      expect(mockDispatcher.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: Channel.ZALO,
          recipientId: 'duong_ngoc_han_zalo_id',
          content: 'Cảm ơn Duong Ngoc Han đã nhắn tin ngoài giờ.',
        }),
      );
    });
  });
});
