import React, { useState, useEffect } from 'react';
import type { KanbanCandidate } from './kanban.types.js';
import type { ChannelType, LeadStage } from '../inbox/types.js';
import { X, UserPlus } from 'lucide-react';
import { notify } from '../../components/feedback/toastEmitter.js';
import { useWorkspaceConfig } from '../workspace/WorkspaceConfigContext.js';
import { useUserRole } from '../auth/UserRoleContext.js';
import { useRealtime } from '../realtime/RealtimeContext.js';
import { useTranslation } from '../../i18n/index.js';

interface NewCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCandidate: (candidate: KanbanCandidate) => void;
}

export const NewCandidateModal: React.FC<NewCandidateModalProps> = ({
  isOpen,
  onClose,
  onAddCandidate,
}) => {
  const { config } = useWorkspaceConfig();
  const { staffName } = useUserRole();
  const { staffPresences } = useRealtime();
  const { t, locale } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<ChannelType>('FACEBOOK');
  const [stage, setStage] = useState<LeadStage>(config.pipelineStages[0]?.id || 'NEW');
  const [course, setCourse] = useState(config.productCatalog[0]?.name || '');
  const [estimatedTuition, setEstimatedTuition] = useState(
    String(config.productCatalog[0]?.defaultPrice || 20000000)
  );
  const [assignedStaff, setAssignedStaff] = useState('staff-me');
  const [notes, setNotes] = useState('');

  // Cập nhật giá mặc định khi đổi sản phẩm / khóa học
  const handleProductChange = (selectedName: string) => {
    setCourse(selectedName);
    const found = config.productCatalog.find((p) => p.name === selectedName);
    if (found && found.defaultPrice) {
      setEstimatedTuition(String(found.defaultPrice));
    }
  };

  useEffect(() => {
    if (config.pipelineStages.length > 0 && !config.pipelineStages.some((s) => s.id === stage)) {
      setStage(config.pipelineStages[0].id);
    }
    if (config.productCatalog.length > 0 && !config.productCatalog.some((p) => p.name === course)) {
      setCourse(config.productCatalog[0].name);
      setEstimatedTuition(String(config.productCatalog[0].defaultPrice || 20000000));
    }
  }, [config, stage, course]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      notify.warning(t('kanban.newCandidateModal.nameRequired', `Vui lòng nhập họ và tên.`));
      return;
    }

    const selectedStaffObj = Object.values(staffPresences).find(
      (s) => s.staffId === assignedStaff
    );
    const assignedName = selectedStaffObj
      ? selectedStaffObj.name
      : staffName
      ? staffName
      : (locale === 'en' ? 'You' : 'Bạn');
    const assignedAvatar = selectedStaffObj
      ? selectedStaffObj.avatar
      : staffName
      ? staffName.slice(0, 2).toUpperCase()
      : 'ME';

    const newCandidate: KanbanCandidate = {
      id: `cand-${Date.now()}`,
      fullName: fullName.trim(),
      phone: phone.trim() || t('kanban.noPhone', 'Chưa có SĐT'),
      email: email.trim() || t('kanban.noEmail', 'Chưa có Email'),
      avatarUrl: `https://images.unsplash.com/photo-${1535713875002 + Math.floor(Math.random() * 1000)}?w=120&auto=format&fit=crop&q=80`,
      channel,
      channelAccountName:
        channel === 'FACEBOOK'
          ? 'Fanpage'
          : channel === 'ZALO'
          ? 'Zalo OA'
          : channel === 'ZALO_PERSONAL'
          ? 'Zalo Personal'
          : 'Direct Hotline',
      stage,
      estimatedTuition: Number(estimatedTuition) || 20000000,
      priority: 'HIGH',
      interestCourses: [course || 'Gói dịch vụ mặc định'],
      assignedStaffId: assignedStaff,
      assignedStaffName: assignedName,
      assignedStaffAvatar: assignedAvatar,
      assignedStaffPresence: 'ONLINE',
      lastActivityAt: t('common.justNow', 'Vừa xong'),
      notesCount: notes.trim() ? 1 : 0,
      tags: [locale === 'en' ? 'Manual Lead' : 'Thêm thủ công', locale === 'en' ? 'Priority' : 'Ưu tiên chăm sóc'],
    };

    onAddCandidate(newCandidate);
    notify.success(t('kanban.newCandidateModal.addSuccess', `Đã thêm thành công vào phễu!`));
    onClose();
  };

  return (
    <div className="crm-modal-backdrop" onClick={onClose}>
      <div className="crm-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-header">
          <div className="modal-title-row">
            <UserPlus size={18} className="modal-title-icon" />
            <h3 className="modal-title">
              {t('kanban.addEntityPrefix', 'Thêm')} {config.terminology.entityName}
            </h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="crm-modal-body">
          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label">{t('kanban.newCandidateModal.nameLabel', 'Họ và tên')} *</label>
              <input
                type="text"
                className="crm-form-input"
                placeholder={t('kanban.newCandidateModal.namePlaceholder', 'VD: Nguyễn Văn A')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('kanban.newCandidateModal.channelLabel', 'Kênh tiếp nhận')}</label>
              <select
                className="crm-form-select"
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChannelType)}
              >
                <option value="FACEBOOK">Facebook Messenger / Fanpage</option>
                <option value="ZALO">Zalo Official Account (OA)</option>
                <option value="ZALO_PERSONAL">Zalo Personal</option>
                <option value="TIKTOK">TikTok Channel</option>
                <option value="MANUAL">Direct / Hotline</option>
              </select>
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label">{t('kanban.newCandidateModal.phoneLabel', 'Số điện thoại liên hệ')}</label>
              <input
                type="tel"
                className="crm-form-input"
                placeholder={t('kanban.newCandidateModal.phonePlaceholder', 'VD: 0912.345.678')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('kanban.newCandidateModal.emailLabel', 'Email liên hệ')}</label>
              <input
                type="email"
                className="crm-form-input"
                placeholder={t('kanban.newCandidateModal.emailPlaceholder', 'VD: customer@gmail.com')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label">{t('kanban.newCandidateModal.initialStageLabel', 'Giai đoạn ban đầu')}</label>
              <select
                className="crm-form-select"
                value={stage}
                onChange={(e) => setStage(e.target.value as LeadStage)}
              >
                {config.pipelineStages.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('kanban.newCandidateModal.assignedStaffLabel', 'Nhân viên phụ trách')}</label>
              <select
                className="crm-form-select"
                value={assignedStaff}
                onChange={(e) => setAssignedStaff(e.target.value)}
              >
                {Object.values(staffPresences).length > 0 ? (
                  Object.values(staffPresences).map((staff) => (
                    <option key={staff.staffId} value={staff.staffId}>
                      {staff.name} - {staff.status}
                    </option>
                  ))
                ) : (
                  <option value="staff-me">
                    {staffName ? `${staffName} (${locale === 'en' ? 'You' : 'Bạn'}) - Online` : `${locale === 'en' ? 'You' : 'Bạn'} - Online`}
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label className="form-label">{config.terminology.productLabel}</label>
              <select
                className="crm-form-select"
                value={course}
                onChange={(e) => handleProductChange(e.target.value)}
              >
                {config.productCatalog.map((prod) => (
                  <option key={prod.id} value={prod.name}>
                    {prod.name} ({new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN').format(prod.defaultPrice)} đ)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{config.terminology.valueLabel}</label>
              <input
                type="number"
                step="500000"
                className="crm-form-input"
                value={estimatedTuition}
                onChange={(e) => setEstimatedTuition(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('kanban.newCandidateModal.notesLabel', 'Ghi chú ban đầu')}</label>
            <textarea
              className="crm-form-textarea"
              rows={2}
              placeholder={t('kanban.newCandidateModal.notesPlaceholder', 'Nhu cầu hoặc lưu ý đặc biệt...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {config.criteria.length > 0 && (
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                {locale === 'en' ? 'Evaluation Criteria' : 'Tiêu chí đánh giá & phân loại'} ({config.criteria.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {config.criteria.map((crit) => (
                  <div key={crit.id} style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontWeight: 600 }}>• {crit.name}:</span>
                    <span style={{ color: '#64748b' }}>{crit.type} {crit.isRequired ? `(${locale === 'en' ? 'Required' : 'Bắt buộc'})` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="crm-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.cancel', 'Hủy bỏ')}
            </button>
            <button type="submit" className="btn btn-primary">
              <UserPlus size={15} />
              <span>{t('kanban.newCandidateModal.saveBtn', 'Thêm vào phễu')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
