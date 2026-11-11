import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  GraduationCap,
  Calendar,
  DollarSign,
  User,
  Tag,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Plus,
  Send,
} from 'lucide-react';
import { notify } from '../../../components/feedback/toastEmitter.js';
import type { DealItem, CreateDealPayload, UpdateDealPayload } from '../../../lib/api-client/deals.js';
import type { PipelineStageConfig, ProductItemConfig } from '../../workspace/workspaceConfig.types.js';
import type { AssignedStaff } from '../../inbox/types.js';
import { useTranslation } from '../../../i18n/index.js';

export interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealToEdit?: DealItem | null;
  customerId?: string;
  contactId?: string;
  customerName?: string;
  pipelineStages: PipelineStageConfig[];
  catalog: ProductItemConfig[];
  staffList?: AssignedStaff[];
  onSave: (payload: CreateDealPayload | UpdateDealPayload, dealId?: string) => Promise<void>;
}

export const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  dealToEdit,
  customerId: _customerId,
  contactId: _contactId,
  customerName = 'Ứng viên',
  pipelineStages,
  catalog,
  staffList = [],
  onSave,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(dealToEdit);

  const [title, setTitle] = useState('');
  const [intake, setIntake] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [customCourseInput, setCustomCourseInput] = useState('');
  const [stage, setStage] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'WON' | 'LOST'>('OPEN');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [expectedRevenue, setExpectedRevenue] = useState<number>(0);
  const [actualRevenue, setActualRevenue] = useState<number | undefined>(undefined);
  const [assignedStaffName, setAssignedStaffName] = useState('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Điền dữ liệu khi mở form (Create mới hoặc Chỉnh sửa)
  useEffect(() => {
    if (isOpen) {
      if (dealToEdit) {
        setTitle(dealToEdit.title || '');
        setIntake(dealToEdit.intake || '');
        setSelectedCourses(dealToEdit.courses || []);
        setStage(dealToEdit.stage || pipelineStages[0]?.id || '');
        setStatus(dealToEdit.status || 'OPEN');
        setPriority(dealToEdit.priority || 'MEDIUM');
        setExpectedRevenue(dealToEdit.expectedRevenue || 0);
        setActualRevenue(dealToEdit.actualRevenue ?? undefined);
        setAssignedStaffName(dealToEdit.assignedStaffName || '');
        setExpectedCloseDate(
          dealToEdit.expectedCloseDate
            ? new Date(dealToEdit.expectedCloseDate).toISOString().split('T')[0]
            : ''
        );
        setLostReason(dealToEdit.lostReason || '');
        setNotes(dealToEdit.notes || '');
      } else {
        // Mặc định tạo mới
        const defaultCourse = catalog[0]?.name;
        const defaultPrice = catalog[0]?.defaultPrice || 0;
        setTitle(defaultCourse ? `${defaultCourse} - ${customerName}` : `Cơ hội tuyển sinh - ${customerName}`);
        setIntake('');
        setSelectedCourses(defaultCourse ? [defaultCourse] : []);
        setStage(pipelineStages[0]?.id || '');
        setStatus('OPEN');
        setPriority('MEDIUM');
        setExpectedRevenue(defaultPrice);
        setActualRevenue(undefined);
        setAssignedStaffName(staffList[0]?.name || '');
        setExpectedCloseDate('');
        setLostReason('');
        setNotes('');
      }
      setCustomCourseInput('');
      setIsSubmitting(false);
    }
  }, [isOpen, dealToEdit, customerName, pipelineStages, catalog, staffList]);

  // Tự động tính tổng học phí dự kiến khi chọn/bỏ chọn khóa học từ Catalog
  const handleToggleCourse = (courseName: string) => {
    let newSelected: string[];
    if (selectedCourses.includes(courseName)) {
      newSelected = selectedCourses.filter((c) => c !== courseName);
    } else {
      newSelected = [...selectedCourses, courseName];
    }
    setSelectedCourses(newSelected);

    // Tính lại expectedRevenue
    let sum = 0;
    newSelected.forEach((cName) => {
      const found = catalog.find((cat) => cat.name === cName);
      if (found && found.defaultPrice) {
        sum += found.defaultPrice;
      }
    });
    setExpectedRevenue(sum);
  };

  const handleAddCustomCourse = () => {
    const trimmed = customCourseInput.trim();
    if (!trimmed) return;
    if (!selectedCourses.includes(trimmed)) {
      setSelectedCourses([...selectedCourses, trimmed]);
    }
    setCustomCourseInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      notify.warning(t('deals.titlePlaceholder', 'Vui lòng nhập tên cơ hội tuyển sinh'));
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateDealPayload | UpdateDealPayload = {
        title: title.trim(),
        courses: selectedCourses,
        intake: intake.trim() || undefined,
        stage: stage || pipelineStages[0]?.id || 'STAGE_NEW',
        status,
        priority,
        expectedRevenue: Number(expectedRevenue) || 0,
        actualRevenue: status === 'WON' ? (actualRevenue !== undefined ? Number(actualRevenue) : Number(expectedRevenue)) : actualRevenue,
        assignedStaffName: assignedStaffName.trim() || undefined,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate).toISOString() : undefined,
        lostReason: status === 'LOST' ? lostReason.trim() : undefined,
        notes: notes.trim() || undefined,
      };

      await onSave(payload, dealToEdit?.id);
      notify.success(t('deals.saveDealSuccess', 'Đã lưu thông tin cơ hội thành công!'));
      onClose();
    } catch (err: any) {
      notify.error(err?.message || 'Không thể lưu cơ hội.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Khóa scroll của body khi modal mở
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================== */}
        {/* 1. HEADER MODAL                                      */}
        {/* ==================================================== */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
              <GraduationCap size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEditing ? t('deals.dealModalEditTitle', 'Cập nhật Dịch vụ / Đợt Tuyển Sinh') : t('deals.dealModalCreateTitle', 'Ghi nhận Dịch vụ / Đợt Tuyển Sinh mới')}
              </h2>
              <p className="text-xs text-slate-500">
                {customerName} • {isEditing ? t('common.edit', 'Chỉnh sửa thông tin') : t('deals.createFirstDealBtn', 'Ghi nhận khóa học / đợt mới')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title={t('common.close', 'Đóng')}
          >
            <X size={18} />
          </button>
        </div>

        {/* ==================================================== */}
        {/* 2. BODY FORM (Cuộn linh hoạt trên mobile/desktop)     */}
        {/* ==================================================== */}
        <form
          id="deal-modal-form"
          onSubmit={handleSubmit}
          className="p-6 overflow-y-auto space-y-4 text-xs"
        >
          {/* Nhóm 1: Tên đợt/dịch vụ & Niên khóa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="block font-semibold text-slate-700">
                {t('deals.titleLabel', 'Tên đợt tuyển sinh / Khóa học')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('deals.titlePlaceholder', 'VD: Lập trình viên Quốc tế Aptech ADSE...')}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">{t('deals.intakeLabel', 'Niên Khóa / Đợt')}</label>
              <input
                type="text"
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                placeholder={t('deals.intakePlaceholder', 'VD: K2026, Đợt 1...')}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Nhóm 2: Trạng thái dịch vụ (Đã loại bỏ dropdown Giai đoạn phễu) */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">{t('deals.statusLabel', 'Trạng Thái Dịch Vụ')}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('OPEN')}
                className={`h-8 flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  status === 'OPEN'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                }`}
              >
                <Clock size={12} />
                <span>{t('deals.serviceStatusInProgress', 'Đang học / Đang đào tạo')}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('WON')}
                className={`h-8 flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  status === 'WON'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                }`}
              >
                <CheckCircle2 size={12} />
                <span>{t('deals.serviceStatusCompleted', 'Đã hoàn thành / Tốt nghiệp')}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('LOST')}
                className={`h-8 flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  status === 'LOST'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 font-semibold shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                }`}
              >
                <XCircle size={12} />
                <span>{t('deals.serviceStatusCancelled', 'Đã hủy / Bảo lưu')}</span>
              </button>
            </div>
          </div>

          {/* Nếu LOST: Hiển thị lý do thất bại */}
          {status === 'LOST' && (
            <div className="space-y-1 p-3 rounded-lg bg-rose-50/70 border border-rose-200 animate-in fade-in">
              <label className="block font-semibold text-rose-800">{t('deals.lostReasonLabel', 'Lý do thất bại / Hủy hồ sơ')}</label>
              <input
                type="text"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="VD: Không đủ học phí, Trùng lịch học trường khác..."
                className="w-full h-8 px-2.5 rounded-lg border border-rose-300 text-xs text-rose-900 bg-white focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* Nhóm 3: Khóa học quan tâm */}
          <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 bg-slate-50/40">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <BookOpen size={13} className="text-blue-500" />
                <span>{t('deals.coursesLabel', 'Khóa Học / Chương Trình Quan Tâm')}</span>
              </label>
              <span className="text-[11px] font-medium text-slate-500">
                Đã chọn: <strong className="text-blue-600">{selectedCourses.length}</strong>
              </span>
            </div>

            {/* Catalog Pills */}
            {catalog && catalog.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 border border-slate-200/80 rounded-lg bg-white">
                {catalog.map((item) => {
                  const isChecked = selectedCourses.includes(item.name);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleCourse(item.name)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer border ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Custom Course Input */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={customCourseInput}
                onChange={(e) => setCustomCourseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomCourse();
                  }
                }}
                placeholder={t('deals.coursesPlaceholder', 'Nhập tên khóa học khác nếu không có trong danh mục...')}
                className="flex-1 h-7.5 px-2.5 rounded-md border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddCustomCourse}
                className="h-7.5 px-2.5 rounded-md bg-slate-200/80 hover:bg-slate-300 text-slate-700 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={12} />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {/* Nhóm 4: Học phí dự kiến & Thực tế */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700 flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-500" />
                <span>{t('deals.expectedRevenueLabel', 'Học Phí Dự Kiến (VNĐ)')}</span>
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                value={expectedRevenue}
                onChange={(e) => setExpectedRevenue(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-emerald-700 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-slate-700 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>{t('deals.actualRevenueLabel', 'Học Phí Thực Thu (VNĐ)')}</span>
              </label>
              <input
                type="number"
                min="0"
                step="100000"
                value={actualRevenue ?? ''}
                placeholder="Để trống nếu chưa thu..."
                onChange={(e) =>
                  setActualRevenue(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Nhóm 5: Nhân viên phụ trách & Mức độ ưu tiên */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700 flex items-center gap-1">
                <User size={13} className="text-indigo-500" />
                <span>{t('deals.assignedStaffLabel', 'Tư Vấn Viên Phụ Trách')}</span>
              </label>
              {staffList && staffList.length > 0 ? (
                <select
                  value={assignedStaffName}
                  onChange={(e) => setAssignedStaffName(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- {t('common.unassigned', 'Chưa chỉ định')} --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name} ({st.role})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={assignedStaffName}
                  onChange={(e) => setAssignedStaffName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A..."
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500"
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-slate-700 flex items-center gap-1">
                <Tag size={13} className="text-amber-500" />
                <span>{t('deals.priorityLabel', 'Mức Độ Ưu Tiên')}</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="LOW">{t('deals.priorityLow', 'Thấp (LOW)')}</option>
                <option value="MEDIUM">{t('deals.priorityMedium', 'Bình thường (MEDIUM)')}</option>
                <option value="HIGH">{t('deals.priorityHigh', 'Cao (HIGH)')}</option>
                <option value="URGENT">{t('deals.priorityUrgent', 'Khẩn cấp (URGENT)')}</option>
              </select>
            </div>
          </div>

          {/* Nhóm 6: Hạn chốt dự kiến */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700 flex items-center gap-1">
              <Calendar size={13} className="text-blue-500" />
              <span>{t('deals.closeDateLabel', 'Hạn Chốt Dự Kiến')}</span>
            </label>
            <input
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Nhóm 7: Ghi chú tuyển sinh */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">{t('deals.notesLabel', 'Ghi Chú Đợt Tuyển Sinh')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('deals.notesPlaceholder', 'VD: Ứng viên xin học bổng 20%, chờ điểm thi tốt nghiệp THPT...')}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </form>

        {/* ==================================================== */}
        {/* 3. FOOTER ACTIONS - Dải đáy cố định (Sticky Footer) */}
        {/* ==================================================== */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8.5 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-medium cursor-pointer transition-colors text-xs disabled:opacity-50"
          >
            {t('common.cancel', 'Hủy')}
          </button>
          <button
            type="submit"
            form="deal-modal-form"
            disabled={isSubmitting}
            className="h-8.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>{t('common.loading', 'Đang lưu...')}</span>
            ) : (
              <>
                <Send size={12} />
                <span>{isEditing ? t('deals.dealModalEditTitle', 'Cập Nhật Cơ Hội') : t('deals.saveDealBtn', 'Tạo Cơ Hội')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
