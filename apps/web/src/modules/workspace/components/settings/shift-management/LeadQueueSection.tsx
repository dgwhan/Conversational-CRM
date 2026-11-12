import React from 'react';
import { Button } from '../../../../../components/ui/index.js';
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
    description="Thông báo trong CRM: lead khẩn cấp sau 2/5/10 phút; lead khác sau 5/15/30 phút."
    actions={(
      <Button size="sm" variant="secondary" onClick={onRefresh} disabled={isLoading}>
        Làm mới
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
                <select
                  aria-label="Chọn nhân viên nhận lead"
                  value={targets[item.conversationId] || ''}
                  onChange={(event) => onTargetChange(item.conversationId, event.target.value)}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                >
                  <option value="">Chọn người nhận</option>
                  {roster.filter((row) => row.isEligible).map((row) => (
                    <option key={row.workspaceMemberId} value={row.workspaceMemberId}>
                      {row.fullName} · {row.openConversations}/{row.effectiveCapacity}
                    </option>
                  ))}
                </select>
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
