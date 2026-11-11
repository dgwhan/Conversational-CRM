import React from 'react';
import {
  Clock,
  UserCheck,
  AlertTriangle,
  ArrowLeft,
  User,
} from 'lucide-react';
import type { ConversationItem, AssignedStaff } from '../../../types.js';
import { Avatar } from '../../../../../components/common/Avatar.js';
import { Button } from '../../../../../components/ui/Button.js';
import { resolveChannelInfo } from '../../../../../lib/channel-meta.js';
import { useTranslation } from '../../../../../i18n/index.js';
import { useUserRole } from '../../../../auth/UserRoleContext.js';
import { getUnresponsiveStatus } from '../../../utils/index.js';

export interface ChatHeaderProps {
  conversation: ConversationItem;
  staffList: AssignedStaff[];
  isWithin24Hours: boolean;
  hoursRemaining: number;
  alertThresholdMinutes?: number;
  onAssignStaff: (staffId: string) => void;
  onBackToList?: () => void;
  onToggleProfile?: () => void;
  isProfileOpen?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  staffList,
  isWithin24Hours,
  hoursRemaining,
  alertThresholdMinutes = 15,
  onAssignStaff,
  onBackToList,
  onToggleProfile,
  isProfileOpen = false,
}) => {
  const { t } = useTranslation();
  const { isOwner, staffId } = useUserRole();
  const channelMeta = resolveChannelInfo(conversation.channel);
  const { isOverdue, waitingMinutes } = getUnresponsiveStatus(conversation, alertThresholdMinutes);

  return (
    <div className="h-13 sm:h-14 px-2.5 sm:px-4 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0 gap-1.5 sm:gap-3 box-border">
      {/* 1. KHU VỰC TRÁI: NÚT BACK MOBILE, AVATAR, TÊN KHÁCH HÀNG & KÊNH */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
        {onBackToList && (
          <button
            type="button"
            className="md:hidden w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-200 flex items-center justify-center text-slate-700 transition-colors shrink-0 cursor-pointer"
            onClick={onBackToList}
            title="Quay lại danh sách hội thoại"
            aria-label="Quay lại danh sách hội thoại"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        <div className="shrink-0">
          <Avatar
            src={conversation.customer.avatarUrl}
            name={conversation.customer.fullName}
            size={34}
            className="border border-slate-200/80 shrink-0"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight m-0 max-w-[95px] xs:max-w-[120px] sm:max-w-[200px]"
            title={conversation.customer.fullName}
          >
            {conversation.customer.fullName}
          </h3>

          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5 min-w-0">
            {channelMeta.iconUrl && (
              <img
                src={channelMeta.iconUrl}
                alt={channelMeta.label}
                className="w-3 h-3 rounded-full object-cover shrink-0"
              />
            )}
            <span className="font-medium text-slate-600 truncate max-w-[70px] sm:max-w-[120px]">
              {channelMeta.label}
            </span>
            {conversation.channelAccountName &&
              !conversation.channelAccountName.startsWith('Kênh ') &&
              conversation.channelAccountName.toLowerCase() !== channelMeta.label.toLowerCase() && (
                <>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="text-slate-500 truncate hidden sm:inline max-w-[100px]">
                    {conversation.channelAccountName}
                  </span>
                </>
              )}
          </div>
        </div>
      </div>

      {/* 2. KHU VỰC PHẢI: CẢNH BÁO SLA, META 24H, GÁN NHÂN VIÊN, NÚT HỒ SƠ */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Cảnh báo tin nhắn chưa phản hồi quá n phút (Ẩn text trên mobile cực nhỏ, hiện dot) */}
        {isOverdue && (
          <div
            className="inline-flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 rounded-md shrink-0"
            title={`Khách hàng đã chờ ${waitingMinutes} phút chưa có phản hồi`}
          >
            <Clock size={11} className="text-rose-500 shrink-0" />
            <span className="hidden sm:inline">Chờ {waitingMinutes >= 60 ? `${Math.floor(waitingMinutes / 60)}h${waitingMinutes % 60}p` : `${waitingMinutes}p`}</span>
            <span className="sm:hidden">{waitingMinutes}p</span>
          </div>
        )}

        {/* Badge 24h Meta (Facebook Messenger) - Thu gọn thông minh trên Mobile */}
        {conversation.channel === 'FACEBOOK' && (
          <div
            className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[11px] font-medium rounded-md border shrink-0 ${
              isWithin24Hours
                ? 'bg-slate-50 text-slate-700 border-slate-200/80'
                : 'bg-amber-50 text-amber-700 border-amber-200/80'
            }`}
            title={
              isWithin24Hours
                ? `Còn ${hoursRemaining} giờ để phản hồi miễn phí theo chính sách Meta`
                : 'Đã quá 24 giờ kể từ tin nhắn cuối của khách. Cần dùng Message Tag.'
            }
          >
            {isWithin24Hours ? (
              <>
                <Clock size={11} className="text-slate-500 shrink-0" />
                <span className="hidden sm:inline">24h Meta (~{hoursRemaining}h)</span>
                <span className="sm:hidden font-semibold">24h</span>
              </>
            ) : (
              <>
                <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Hết hạn 24h</span>
                <span className="sm:hidden font-semibold">Hết 24h</span>
              </>
            )}
          </div>
        )}

        {/* Phân công nhân viên - Tối ưu kích thước trên Mobile */}
        {isOwner ? (
          <div className="relative inline-flex items-center shrink-0">
            <UserCheck size={12} className="absolute left-2 text-slate-400 pointer-events-none" />
            <select
              className="h-7 sm:h-8 pl-6 pr-2 sm:pr-3 text-[11px] sm:text-xs font-medium text-slate-700 bg-slate-50/80 border border-slate-200/80 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:bg-white transition-colors cursor-pointer max-w-[85px] xs:max-w-[105px] sm:max-w-[140px] truncate"
              value={conversation.assignedStaff?.id || ''}
              onChange={(e) => onAssignStaff(e.target.value)}
              title="Phân công tư vấn viên"
            >
              <option value="">{t('inbox.chatHeader.unassigned')}</option>
              {conversation.assignedStaff?.id && !staffList.some((st) => st.id === conversation.assignedStaff?.id) && (
                <option value={conversation.assignedStaff.id}>
                  {conversation.assignedStaff.name}
                </option>
              )}
              {staffList.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="shrink-0">
            {conversation.assignedStaff?.id === staffId ? (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 text-[11px] font-medium rounded-md bg-slate-50 text-slate-700 border border-slate-200/80">
                <UserCheck size={12} className="text-blue-600 shrink-0" />
                <span className="hidden sm:inline">Bạn phụ trách</span>
                <span className="sm:hidden font-semibold">Của bạn</span>
              </span>
            ) : !conversation.assignedStaff ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={<UserCheck size={12} />}
                onClick={() => onAssignStaff(staffId)}
                title="Nhận cuộc hội thoại này để bắt đầu tư vấn"
                className="!h-7 sm:!h-8 !px-2 !text-[11px]"
              >
                Nhận
              </Button>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 px-1.5 sm:px-2 py-1 bg-slate-50 border border-slate-200/80 rounded-md max-w-[80px] sm:max-w-[120px] truncate inline-block">
                {conversation.assignedStaff.name}
              </span>
            )}
          </div>
        )}

        {/* Nút Xem Hồ Sơ trên Mobile */}
        {onToggleProfile && (
          <button
            type="button"
            className={`lg:hidden h-7 sm:h-8 inline-flex items-center gap-1 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 border ${
              isProfileOpen
                ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-xs'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border-slate-200/80'
            }`}
            onClick={onToggleProfile}
            title="Xem thông tin chi tiết hồ sơ khách hàng"
            aria-expanded={isProfileOpen}
            aria-label="Xem hồ sơ khách hàng"
          >
            <User size={13} className={isProfileOpen ? 'text-blue-600' : 'text-slate-600'} />
            <span className="hidden xs:inline">Hồ sơ</span>
          </button>
        )}
      </div>
    </div>
  );
};
