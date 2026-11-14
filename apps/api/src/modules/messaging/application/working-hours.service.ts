import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { RealtimeService } from '../../realtime/realtime.service.js';
import { WorkspaceConfigService } from '../../workspace-config/application/workspace-config/index.js';
import { MessageDispatcherService } from '../../channel-connection/application/message-dispatcher.service.js';
import {
  WorkingHoursConfig,
  getDefaultWorkingHoursConfig,
  DayWorkingSchedule,
} from '../../../contracts/workspace-config.js';
import { Channel, MessageDirection } from '../domain/channel.js';
import { DistributedLockService } from '../../../platform/redis/distributed-lock.service.js';

/** Tin đến trễ hơn ngưỡng này (đồng bộ lịch sử, webhook retry muộn) thì không auto-reply/gắn tag nữa. */
const MAX_INBOUND_AGE_MS = 30 * 60 * 1000;
/** Thời gian giữ khóa tối đa cho một lượt gửi auto-reply. */
const AUTO_REPLY_LOCK_TTL_MS = 30 * 1000;

const isUuid = (val?: string | null): val is string =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export interface CheckWorkingHoursResult {
  isWithinHours: boolean;
  dayOfWeek: number; // 1: T2, 2: T3, ..., 7: CN
  dayName: string;
  currentTime: string; // HH:mm
  schedule?: DayWorkingSchedule;
  reason?: 'DISABLED' | 'CLOSED_TODAY' | 'BEFORE_OPEN' | 'AFTER_CLOSE' | 'WITHIN_HOURS';
}

export interface InboundOutOfOfficeInput {
  messageId: string;
  conversationId: string;
  channel: Channel;
  senderExternalId: string;
  channelAccountId?: string;
  externalAccountId?: string;
  workspaceId?: string | null;
  sentAt?: Date;
}

@Injectable()
export class WorkingHoursService {
  private readonly logger = new Logger(WorkingHoursService.name);
  private _dispatcherInstance?: MessageDispatcherService;

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly realtime?: RealtimeService,
    @Optional() private readonly workspaceConfigService?: WorkspaceConfigService,
    @Optional()
    @Inject(forwardRef(() => MessageDispatcherService))
    private readonly injectedDispatcher?: any,
    @Optional() private readonly moduleRef?: ModuleRef,
    @Optional() private readonly locks?: DistributedLockService,
  ) {}

  /** Chạy task độc quyền theo key; không có lock service thì dùng khóa trong tiến trình. */
  private readonly localLocks = new Set<string>();
  private async runExclusive<T>(key: string, task: () => Promise<T>): Promise<T | undefined> {
    if (this.locks) return this.locks.runExclusive(key, AUTO_REPLY_LOCK_TTL_MS, task);
    if (this.localLocks.has(key)) return undefined;
    this.localLocks.add(key);
    try {
      return await task();
    } finally {
      this.localLocks.delete(key);
    }
  }

  private get dispatcher(): MessageDispatcherService | undefined {
    if (this._dispatcherInstance) return this._dispatcherInstance;
    if (this.injectedDispatcher) {
      this._dispatcherInstance = this.injectedDispatcher;
      return this._dispatcherInstance;
    }
    if (this.moduleRef) {
      try {
        this._dispatcherInstance = this.moduleRef.get(MessageDispatcherService, { strict: false });
        return this._dispatcherInstance;
      } catch {}
    }
    return undefined;
  }

  /**
   * Kiểm tra xem thời điểm cụ thể có nằm trong khung giờ làm việc hay không
   * Múi giờ mặc định: Asia/Ho_Chi_Minh (UTC+7)
   */
  checkIsWorkingHour(
    targetDate: Date = new Date(),
    config?: WorkingHoursConfig,
  ): CheckWorkingHoursResult {
    const fullConfig = config || getDefaultWorkingHoursConfig();
    const timezone = fullConfig.timezone || 'Asia/Ho_Chi_Minh';

    if (fullConfig.enabled === false) {
      return {
        isWithinHours: true,
        dayOfWeek: 1,
        dayName: 'Toàn thời gian',
        currentTime: '00:00',
        reason: 'DISABLED',
      };
    }

    // Đảm bảo targetDate là Date hợp lệ
    const validDate =
      targetDate instanceof Date && !isNaN(targetDate.getTime()) ? targetDate : new Date();

    // Định dạng thời gian theo đúng Timezone đã cấu hình
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short', // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(validDate);

    let weekdayStr = '';
    let hourStr = '00';
    let minuteStr = '00';

    for (const part of parts) {
      if (part.type === 'weekday') weekdayStr = part.value;
      if (part.type === 'hour') hourStr = part.value;
      if (part.type === 'minute') minuteStr = part.value;
    }

    // Chuẩn hóa giờ 24
    if (hourStr === '24') hourStr = '00';
    hourStr = hourStr.padStart(2, '0');
    minuteStr = minuteStr.padStart(2, '0');
    const currentTime = `${hourStr}:${minuteStr}`;

    // Ánh xạ weekday sang 1 (T2) -> 7 (CN)
    const weekdayMap: Record<string, { dayOfWeek: number; dayName: string }> = {
      Mon: { dayOfWeek: 1, dayName: 'Thứ Hai' },
      Tue: { dayOfWeek: 2, dayName: 'Thứ Ba' },
      Wed: { dayOfWeek: 3, dayName: 'Thứ Tư' },
      Thu: { dayOfWeek: 4, dayName: 'Thứ Năm' },
      Fri: { dayOfWeek: 5, dayName: 'Thứ Sáu' },
      Sat: { dayOfWeek: 6, dayName: 'Thứ Bảy' },
      Sun: { dayOfWeek: 7, dayName: 'Chủ Nhật' },
    };

    const currentDay = weekdayMap[weekdayStr] || { dayOfWeek: 1, dayName: 'Thứ Hai' };
    const schedules = Array.isArray(fullConfig.schedules) ? fullConfig.schedules : [];

    // Tìm lịch làm việc của ngày hôm nay
    const schedule = schedules.find(
      (s) =>
        s.dayOfWeek === currentDay.dayOfWeek ||
        (currentDay.dayOfWeek === 7 && s.dayOfWeek === 0),
    );

    // Nếu ngày đó không được cấu hình hoặc đóng cửa
    if (!schedule || !schedule.isOpen) {
      return {
        isWithinHours: false,
        dayOfWeek: currentDay.dayOfWeek,
        dayName: currentDay.dayName,
        currentTime,
        schedule,
        reason: 'CLOSED_TODAY',
      };
    }

    const openTime = schedule.openTime || '07:00';
    const closeTime = schedule.closeTime || '17:00';

    // Ca qua đêm (vd 22:00 → 06:00): trong giờ khi >= giờ mở HOẶC < giờ đóng
    if (openTime > closeTime) {
      const within = currentTime >= openTime || currentTime < closeTime;
      return {
        isWithinHours: within,
        dayOfWeek: currentDay.dayOfWeek,
        dayName: currentDay.dayName,
        currentTime,
        schedule,
        reason: within ? 'WITHIN_HOURS' : 'AFTER_CLOSE',
      };
    }

    if (currentTime < openTime) {
      return {
        isWithinHours: false,
        dayOfWeek: currentDay.dayOfWeek,
        dayName: currentDay.dayName,
        currentTime,
        schedule,
        reason: 'BEFORE_OPEN',
      };
    }

    // Đóng cửa đúng tại closeTime (17:00 đã là ngoài giờ)
    if (currentTime >= closeTime) {
      return {
        isWithinHours: false,
        dayOfWeek: currentDay.dayOfWeek,
        dayName: currentDay.dayName,
        currentTime,
        schedule,
        reason: 'AFTER_CLOSE',
      };
    }

    return {
      isWithinHours: true,
      dayOfWeek: currentDay.dayOfWeek,
      dayName: currentDay.dayName,
      currentTime,
      schedule,
      reason: 'WITHIN_HOURS',
    };
  }

  /**
   * Xử lý tin nhắn đến ngoài giờ làm việc:
   * 1. Đánh dấu hội thoại (tag 'HẸN TƯ VẤN SÁNG HÔM SAU' hoặc tag tùy biến)
   * 2. Gửi lời nhắn tự động out-of-office (nếu chưa gửi trong khoảng cooldown)
   */
  async processInboundOutOfOffice(input: InboundOutOfOfficeInput): Promise<void> {
    if (!this.prisma) return;

    // Tin cũ (đồng bộ lịch sử / webhook đến muộn) không còn là "khách đang chờ" → không gắn tag, không trả lời tự động
    const receivedAt =
      input.sentAt instanceof Date && !isNaN(input.sentAt.getTime()) ? input.sentAt : new Date();
    if (Date.now() - receivedAt.getTime() > MAX_INBOUND_AGE_MS) {
      this.logger.debug(
        `[OUT_OF_OFFICE] Bỏ qua tin ${input.messageId}: gửi lúc ${receivedAt.toISOString()}, quá ${MAX_INBOUND_AGE_MS / 60000} phút.`,
      );
      return;
    }

    try {
      // 1. Xác định Conversation, Workspace ID và Channel Account
      let resolvedWorkspaceId = input.workspaceId;
      let resolvedChannelAccountId = input.channelAccountId;

      // An toàn với UUID: Chỉ gọi findUnique nếu conversationId đúng chuẩn UUID
      let conv: any = null;
      if (isUuid(input.conversationId)) {
        try {
          conv = await this.prisma.conversation.findUnique({
            where: { id: input.conversationId },
            select: { id: true, tags: true, workspaceId: true, channelAccountId: true, customerId: true, snippet: true },
          });
        } catch {}
      }

      // Nếu chưa có channelAccountId, tìm qua externalAccountId
      if (!resolvedChannelAccountId && input.externalAccountId) {
        try {
          const chAcc = await this.prisma.channelAccount.findFirst({
            where: { channel: input.channel, externalAccountId: input.externalAccountId },
            select: { id: true, workspaceId: true },
          });
          if (chAcc) {
            resolvedChannelAccountId = chAcc.id;
            if (!resolvedWorkspaceId && chAcc.workspaceId) resolvedWorkspaceId = chAcc.workspaceId;
          }
        } catch {}
      }

      // Nếu conv chưa tìm thấy qua id, tìm qua Customer hoặc channelAccountId
      if (!conv && input.senderExternalId) {
        try {
          const cust = await this.prisma.customer.findFirst({
            where: {
              OR: [
                { channelIdentities: { path: [input.channel.toLowerCase()], equals: input.senderExternalId } },
                { channelIdentities: { path: [input.channel.toLowerCase(), 'id'], equals: input.senderExternalId } },
                { channelIdentities: { path: ['socialId'], equals: input.senderExternalId } },
                { identities: { some: { channel: input.channel as any, externalUserId: input.senderExternalId } } },
              ],
            },
            select: { id: true, workspaceId: true },
          });

          if (cust) {
            if (!resolvedWorkspaceId && cust.workspaceId) resolvedWorkspaceId = cust.workspaceId;
            conv = await this.prisma.conversation.findFirst({
              where: {
                customerId: cust.id,
                ...(resolvedChannelAccountId ? { channelAccountId: resolvedChannelAccountId } : {}),
              },
              orderBy: { lastMessageAt: 'desc' },
              select: { id: true, tags: true, workspaceId: true, channelAccountId: true, snippet: true },
            });
          }
        } catch {}
      }

      if (conv) {
        if (!resolvedWorkspaceId && conv.workspaceId) resolvedWorkspaceId = conv.workspaceId;
        if (!resolvedChannelAccountId && conv.channelAccountId) resolvedChannelAccountId = conv.channelAccountId;
      }

      // 2. Lấy cấu hình Working Hours của workspace
      let workingHours: WorkingHoursConfig = getDefaultWorkingHoursConfig();
      if (this.workspaceConfigService) {
        try {
          const wsConfig = await this.workspaceConfigService.getConfig(
            resolvedWorkspaceId || 'ws-default-001',
          );
          if (wsConfig?.workingHours) {
            workingHours = wsConfig.workingHours;
          }
        } catch (err) {
          this.logger.warn(
            `Could not load workspace config for ${resolvedWorkspaceId}: ${(err as Error).message}`,
          );
        }
      }

      // Nếu tính năng bị tắt
      if (workingHours.enabled === false) {
        return;
      }

      // 3. Kiểm tra xem thời điểm nhận tin có ngoài khung giờ làm việc không
      const checkResult = this.checkIsWorkingHour(receivedAt, workingHours);
      if (checkResult.isWithinHours) {
        // Trong giờ làm việc bình thường -> không kích hoạt auto-reply
        return;
      }

      this.logger.log(
        `[OUT_OF_OFFICE] Nhận tin nhắn ngoài giờ (${checkResult.dayName} ${checkResult.currentTime}, lý do: ${checkResult.reason}). Hội thoại: ${input.conversationId}`,
      );

      const outOfOfficeTag = workingHours.outOfOfficeTag || 'HẸN TƯ VẤN SÁNG HÔM SAU';
      const autoReplyText = (workingHours.autoReplyMessage || '').trim();
      const cooldownMinutes = workingHours.cooldownMinutes ?? 60;
      const cooldownMs = cooldownMinutes * 60 * 1000;

      // 4. ĐÁNH DẤU ĐOẠN HỘI THOẠI (MARK CONVERSATION)
      let updatedTags: string[] = [];
      if (conv) {
        const currentTags: string[] = Array.isArray(conv.tags) ? conv.tags : [];
        if (!currentTags.includes(outOfOfficeTag)) {
          updatedTags = [...currentTags, outOfOfficeTag];
          conv = await this.prisma.conversation.update({
            where: { id: conv.id },
            data: { tags: updatedTags },
            select: { id: true, tags: true, workspaceId: true, channelAccountId: true, snippet: true },
          });
          this.logger.log(
            `[OUT_OF_OFFICE] Đã đánh dấu tag "${outOfOfficeTag}" cho cuộc hội thoại ${conv.id}`,
          );
        } else {
          updatedTags = currentTags;
        }
      }

      // 5. TỰ ĐỘNG GỬI LỜI NHẮN (AUTO-REPLY)
      if (!autoReplyText) return;

      const finalChannelAccountId: string = resolvedChannelAccountId || conv?.channelAccountId || '';
      const finalConversationId: string | undefined =
        conv?.id || (isUuid(input.conversationId) ? input.conversationId : undefined);
      if (!finalChannelAccountId) {
        this.logger.warn(
          `[OUT_OF_OFFICE] Không xác định được tài khoản kênh cho ${input.channel}:${input.senderExternalId}, bỏ qua auto-reply.`,
        );
        return;
      }

      // Khóa theo (tài khoản kênh, người gửi): khách gửi dồn nhiều tin cùng lúc thì chỉ một lượt
      // được kiểm tra cooldown + gửi, tránh race khiến khách nhận nhiều tin trả lời tự động.
      const lockKey = `auto-reply:${finalChannelAccountId}:${input.senderExternalId}`;
      await this.runExclusive(lockKey, async () => {
        // Cooldown: đã có auto-reply cho khách này (theo hội thoại HOẶC theo người nhận trên cùng tài khoản kênh)
        if (cooldownMs > 0) {
          const recentAutoReply = await this.prisma!.message.findFirst({
            where: {
              direction: MessageDirection.OUTBOUND,
              content: autoReplyText,
              sentAt: { gte: new Date(Date.now() - cooldownMs) },
              OR: [
                ...(finalConversationId ? [{ conversationId: finalConversationId }] : []),
                {
                  channelAccountId: finalChannelAccountId,
                  rawPayload: { path: ['recipient', 'id'], equals: input.senderExternalId },
                },
              ],
            },
            select: { id: true },
          });
          if (recentAutoReply) {
            this.logger.log(
              `[OUT_OF_OFFICE] Đã gửi tin nhắn tự động trước đó trong vòng ${cooldownMinutes} phút. Bỏ qua chống spam.`,
            );
            return;
          }
        }

        if (this.dispatcher) {
          // Dispatcher tự lưu tin OUTBOUND và tự phát realtime → không broadcast thêm (tránh tin hiện 2 lần)
          try {
            await this.dispatcher.sendMessage({
              channel: input.channel as any,
              recipientId: input.senderExternalId,
              content: autoReplyText,
              channelAccountId: finalChannelAccountId,
              conversationId: finalConversationId,
              workspaceId: resolvedWorkspaceId || undefined,
            });
            this.logger.log(
              `[OUT_OF_OFFICE] Đã tự động gửi lời nhắn ngoài giờ đến khách hàng (${input.senderExternalId}) trên kênh ${input.channel}`,
            );
          } catch (dispatchErr) {
            this.logger.error(
              `[OUT_OF_OFFICE] Không thể gửi tin qua Dispatcher: ${(dispatchErr as Error).message}`,
            );
          }
          return;
        }

        if (!finalConversationId) return;

        // Fallback: không có Dispatcher → lưu trực tiếp tin outbound vào DB và phát Realtime
        const now = new Date();
        const autoMsg = await this.prisma!.message.create({
          data: {
            conversationId: finalConversationId,
            channelAccountId: finalChannelAccountId,
            channel: input.channel,
            direction: MessageDirection.OUTBOUND,
            content: autoReplyText,
            sentAt: now,
            externalMessageId: `auto_reply_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            rawPayload: {
              isAutoReply: true,
              type: 'OUT_OF_OFFICE_REPLY',
              reason: checkResult.reason,
              recipient: { id: input.senderExternalId },
            },
            processedAt: now,
          },
        });
        this.logger.log(`[OUT_OF_OFFICE] Đã lưu tin nhắn phản hồi tự động vào DB: ${autoMsg.id}`);

        try {
          this.realtime?.broadcastNewMessage({
            id: autoMsg.id,
            conversationId: finalConversationId,
            channel: input.channel as any,
            direction: 'OUTBOUND',
            content: autoReplyText,
            senderName: 'Hệ thống tự động',
            sentAt: now.toISOString(),
            tags: updatedTags.length > 0 ? updatedTags : [outOfOfficeTag],
            isOutOfOffice: true,
            outOfOfficeTag,
            workspaceId: resolvedWorkspaceId || undefined,
          } as any);
        } catch {}
      });
    } catch (err) {
      this.logger.error(
        `[OUT_OF_OFFICE] Lỗi xử lý ngoài giờ làm việc: ${(err as Error).message}`,
        err as Error,
      );
    }
  }
}
