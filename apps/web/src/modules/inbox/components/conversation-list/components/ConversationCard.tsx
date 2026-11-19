import React from 'react';
import { CheckCheck, Clock, Moon } from 'lucide-react';
import type { ConversationItem, ChannelType } from '../../../types.js';
import { formatConversationTime, getUnresponsiveStatus } from '../../../utils/index.js';
import { Avatar } from '../../../../../components/common/Avatar.js';
import { resolveChannelInfo } from '../../../../../lib/channel-meta.js';
import { evaluateConversationScore } from '../../../utils/leadScoringUtils.js';
import { useLeadScoringConfig } from '../../../context/leadScoringConfig.js';

export interface ConversationCardProps {
  item: ConversationItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  alertThresholdMinutes?: number;
}

export const ConversationCard: React.FC<ConversationCardProps> = ({
  item,
  isSelected,
  onSelect,
  alertThresholdMinutes = 15,
}) => {
  const hasUnread = item.unreadCount > 0;
  const { rules, settings } = useLeadScoringConfig();
  const { isOverdue, waitingMinutes } = getUnresponsiveStatus(item, alertThresholdMinutes);

  const isOutOfOffice = Boolean(
    item.tags?.some((t) => {
      const lower = String(t || '').toLowerCase();
      return (
        lower.includes('ngoài giờ') ||
        lower.includes('ngoai_gio') ||
        lower.includes('hẹn tư vấn') ||
        lower.includes('sáng mai') ||
        lower.includes('hôm sau')
      );
    }),
  );

  const scoringData = React.useMemo(() => {
    if (!settings) return null;
    return evaluateConversationScore(item.messages || [], item.customer.phone, rules, settings);
  }, [item.messages, item.customer.phone, rules, settings]);

  const renderChannelIndicator = (channel: ChannelType) => {
    const meta = resolveChannelInfo(channel);
    const titleText = `${meta.label}${
      item.channelAccountName ? ` • ${item.channelAccountName}` : ''
    }${item.channelAccountPhone ? ` (${item.channelAccountPhone})` : ''}`;
    return (
      <span
        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white text-[8px] font-bold flex items-center justify-center ring-1 ring-white overflow-hidden"
        style={{ backgroundColor: meta.badgeBg }}
        title={titleText}
      >
        {meta.iconUrl ? (
          <img
            src={meta.iconUrl}
            alt={meta.label}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          meta.badgeText.slice(0, 1)
        )}
      </span>
    );
  };

  const showTier =
    Boolean(settings && scoringData && scoringData.score > 0 && scoringData.tier !== 'IRRELEVANT');

  return (
    <div
      onClick={() => onSelect(item.id)}
      className={`group relative flex items-start gap-2.5 px-3.5 py-2.5 transition-colors cursor-pointer select-none ${isSelected
          ? 'bg-blue-50/75 before:absolute before:left-0 before:inset-y-0 before:w-[2.5px] before:bg-blue-600'
          : isOutOfOffice
            ? 'bg-amber-50/25 hover:bg-amber-50/50 before:absolute before:left-0 before:inset-y-0 before:w-[2px] before:bg-amber-400'
            : isOverdue
              ? 'bg-rose-50/30 hover:bg-rose-50/60 before:absolute before:left-0 before:inset-y-0 before:w-[2px] before:bg-rose-500'
              : hasUnread
                ? 'bg-slate-50/70 hover:bg-slate-100/70'
                : 'bg-white hover:bg-slate-50'
        }`}
    >
      {/* 1. Avatar khách hàng */}
      <div className="relative shrink-0 mt-0.5">
        <Avatar
          src={item.customer.avatarUrl}
          name={item.customer.fullName}
          size={36}
          className="rounded-full"
          badge={renderChannelIndicator(item.channel)}
        />
      </div>

      {/* 2. Nội dung hội thoại mật độ cao */}
      <div className="flex-1 min-w-0">
        {/* Hàng 1: Tên khách + Cảnh báo + Giờ */}
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={`text-[13px] truncate ${hasUnread ? 'font-semibold text-slate-950' : 'font-medium text-slate-900'
              }`}
          >
            {item.customer.fullName}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {isOverdue && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 tabular-nums"
                title={`Chưa phản hồi ${waitingMinutes} phút`}
              >
                <Clock size={10} />
                <span>
                  {waitingMinutes >= 60 ? `${Math.floor(waitingMinutes / 60)}h` : `${waitingMinutes}p`}
                </span>
              </span>
            )}
            {isOutOfOffice && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700"
                title="Tin nhắn đến ngoài giờ làm việc - Cần tư vấn hôm sau"
              >
                <Moon size={10} />
                <span>Hẹn sáng mai</span>
              </span>
            )}
            <span
              className={`text-[11px] tabular-nums whitespace-nowrap ${hasUnread ? 'font-semibold text-blue-600' : 'text-slate-400'
                }`}
            >
              {formatConversationTime(item.lastMessageAt)}
            </span>
          </div>
        </div>

        {/* Hàng 2: Preview tin nhắn cuối + Chấm/số chưa đọc */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <p
            className={`text-xs truncate m-0 leading-snug ${hasUnread ? 'font-medium text-slate-800' : 'text-slate-500'
              }`}
          >
            {item.snippet || 'Hội thoại mới'}
          </p>

          {hasUnread && (
            <span className="shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold inline-flex items-center justify-center tabular-nums">
              {item.unreadCount}
            </span>
          )}
        </div>

        {/* Hàng 3: Metadata inline phẳng (Hạng tiềm năng / Tag + Nhân sự phụ trách) */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0 truncate text-slate-500">
            {showTier && settings && scoringData && (
              <span
                className={`inline-flex items-center gap-1 font-medium shrink-0 ${scoringData.tier === 'HOT' ? 'text-emerald-700' : 'text-slate-600'
                  }`}
                title={`Mức độ tiềm năng: ${settings.tierLabels[scoringData.tier]}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${scoringData.tier === 'HOT' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                />
                <span>{settings.tierLabels[scoringData.tier]}</span>
              </span>
            )}

            {showTier && item.tags.length > 0 && (
              <span className="text-slate-300 shrink-0">•</span>
            )}

            {item.tags.slice(0, 1).map((tag: string, idx: number) => (
              <span key={idx} className="truncate text-slate-500">
                {tag}
              </span>
            ))}

            {item.channelAccountName &&
              !item.channelAccountName.startsWith('Kênh ') &&
              item.channelAccountName !== 'Zalo OA' &&
              item.channelAccountName !== 'Facebook Page' && (
                <span
                  className="text-[10px] text-blue-700 bg-blue-50/80 border border-blue-200/50 px-1 py-0.2 rounded truncate max-w-[85px] shrink-0"
                  title={`Tài khoản Zalo nhận: ${item.channelAccountName}${
                    item.channelAccountPhone ? ` (${item.channelAccountPhone})` : ''
                  }`}
                >
                  {item.channelAccountName.split(' ')[0]}
                  {item.channelAccountPhone ? ` (${item.channelAccountPhone.slice(-4)})` : ''}
                </span>
              )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {!hasUnread && <CheckCheck size={12} className="text-slate-400" />}

            {item.assignedStaff ? (
              <span
                className="text-slate-500 truncate max-w-[76px]"
                title={`Phụ trách: ${item.assignedStaff.name}`}
              >
                {item.assignedStaff.name.split(' ')[0]}
              </span>
            ) : (
              <span
                className="font-medium text-amber-700"
                title="Chưa gán tư vấn viên"
              >
                Chờ nhận
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};