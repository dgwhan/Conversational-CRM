import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, SearchableSelect } from '../../../../../components/ui/index.js';
import type { LeadQueueItem, StaffRoutingStatus } from '../../../hooks/useWorkspaceLeadRouting.js';
import { ShiftSection } from './ShiftSection.js';

interface LeadQueueSectionProps {
  queue: LeadQueueItem[];
  roster: StaffRoutingStatus[];
  targets: Record<string, string>;
  canManageQueue: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onTargetChange: (conversationId: string, memberId: string) => void;
  onAssign: (conversationId: string, memberId: string) => void;
  onClaim: (conversationId: string) => void;
}

export const LeadQueueSection: React.FC<LeadQueueSectionProps> = ({
  queue,
  roster,
  targets,
  canManageQueue,
  isLoading,
  onRefresh,
  onTargetChange,
  onAssign,
  onClaim,
}) => (
  <ShiftSection
    title="Hàng chờ chưa phân công"
    help={{
      title: "Hàng chờ chưa phân công",
      description:
        "Danh sách tập trung các khách hàng mới phát sinh tương tác nhưng chưa có nhân sự trực ca tiếp nhận hoặc hàng đợi đang quá tải.",
      example:
        "Khách hàng gửi tin nhắn khi toàn bộ nhân viên trong ca đã chạm hạn mức. Hội thoại tự động chuyển vào hàng chờ và gửi thông báo nhắc nhở định kỳ cho toàn bộ ca trực.",
      rules: [
        "Hội thoại được đánh dấu khẩn cấp sẽ kích hoạt chuông nhắc nhở sau các mốc 2, 5 và 10 phút.",
        "Các hội thoại tiêu chuẩn kích hoạt nhắc nhở sau các mốc 5, 15 và 30 phút.",
        "Nhân sự trong ca có thể chủ động nhận khách (Claim) hoặc Ca trưởng điều phối chỉ định cho nhân viên cụ thể.",
      ],
    }}
    actions={(
      <Button
        size="sm"
        variant="secondary"
        onClick={onRefresh}
        disabled={isLoading}
        className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5"
      >
        <RefreshCw size={13} className={`shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
        <span>Làm mới</span>
      </Button>
    )}
  >
    {queue.length ? (
      <div className="divide-y divide-slate-100">
        {queue.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div>
              <p className="m-0 text-sm font-medium text-slate-800">
                {item.conversation.customer?.fullName || 'Khách hàng'}
                <span className="text-xs font-normal text-slate-500">
                  {' · '}{item.priority >= 2 ? 'Khẩn cấp · ' : ''}{item.reason} · Mức nhắc {item.escalationLevel}
                </span>
              </p>
              <p className="mb-0 mt-1 text-xs text-slate-500">{item.conversation.snippet || 'Có tin nhắn mới'}</p>
            </div>
            {canManageQueue ? (
              <div className="flex flex-wrap items-center gap-2">
                <SearchableSelect
                  aria-label="Chọn nhân viên nhận lead"
                  value={targets[item.conversationId] || ''}
                  onChange={(val) => onTargetChange(item.conversationId, val)}
                  placeholder="Chọn người nhận"
                  options={roster
                    .filter((row) => row.isEligible)
                    .map((row) => ({
                      value: row.workspaceMemberId,
                      label: `${row.fullName} · ${row.openConversations}/${row.effectiveCapacity}`,
                    }))}
                  size="sm"
                  className="min-w-[180px]"
                  searchPlaceholder="Tìm nhân viên..."
                />
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!targets[item.conversationId]}
                  onClick={() => onAssign(item.conversationId, targets[item.conversationId])}
                >
                  Gán cho nhân viên
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="primary" onClick={() => onClaim(item.conversationId)}>
                Nhận lead
              </Button>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="mb-0 text-xs text-slate-500">Chưa có hội thoại nào đang chờ phân công.</p>
    )}
  </ShiftSection>
);
