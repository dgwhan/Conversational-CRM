import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Briefcase,
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
  Layers,
} from 'lucide-react';
import { notify } from '../../../components/feedback/toastEmitter.js';
import type { DealItem, CreateDealPayload, UpdateDealPayload } from '../../../lib/api-client/deals.js';
import type { PipelineStageConfig, ProductItemConfig } from '../../workspace/workspaceConfig.types.js';
import type { AssignedStaff } from '../../inbox/types.js';

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
  customerId,
  contactId,
  customerName = 'Ứng viên',
  pipelineStages,
  catalog,
  staffList = [],
  onSave,
}) => {
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

  // Mặc định stage đầu tiên
  const defaultStage = useMemo(() => {
    return pipelineStages[0]?.id || 'STAGE_NEW';
  }, [pipelineStages]);

  useEffect(() => {
    if (isOpen) {
      if (dealToEdit) {
        setTitle(dealToEdit.title || '');
        setIntake(dealToEdit.intake || '');
        setSelectedCourses(dealToEdit.courses || []);
        setStage(dealToEdit.stage || defaultStage);
        setStatus(dealToEdit.status || 'OPEN');
        setPriority(dealToEdit.priority || 'MEDIUM');
        setExpectedRevenue(dealToEdit.expectedRevenue || 0);
        setActualRevenue(dealToEdit.actualRevenue ?? undefined);
        setAssignedStaffName(dealToEdit.assignedStaffName || '');
        setExpectedCloseDate(
          dealToEdit.expectedCloseDate ? dealToEdit.expectedCloseDate.substring(0, 10) : ''
        );
        setLostReason(dealToEdit.lostReason || '');
        setNotes(dealToEdit.notes || '');
      } else {
        const currentYear = new Date().getFullYear();
        setTitle(`Đăng ký tuyển sinh đợt ${currentYear}`);
        setIntake(`K${currentYear}`);
        setSelectedCourses([]);
        setStage(defaultStage);
        setStatus('OPEN');
        setPriority('MEDIUM');
        setExpectedRevenue(0);
        setActualRevenue(undefined);
        setAssignedStaffName('');
        setExpectedCloseDate('');
        setLostReason('');
        setNotes('');
      }
      setCustomCourseInput('');
      setIsSubmitting(false);
    }
  }, [isOpen, dealToEdit, defaultStage]);

  // Tự động tính học phí khi chọn khóa học từ catalog
  const handleToggleCourse = (courseName: string) => {
    let next: string[];
    if (selectedCourses.includes(courseName)) {
      next = selectedCourses.filter((c) => c !== courseName);
    } else {
      next = [...selectedCourses, courseName];
    }
    setSelectedCourses(next);

    // Tính lại học phí nếu chưa nhập tay khác biệt
    const sum = next.reduce((acc, cName) => {
      const match = catalog.find((item) => item.name === cName || item.id === cName);
      return acc + (match?.defaultPrice || 0);
    }, 0);
    if (sum > 0) {
      setExpectedRevenue(sum);
    }
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
      notify.error('Vui lòng nhập tên đợt tuyển sinh / cơ hội!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateDealPayload | UpdateDealPayload = {
        title: title.trim(),
        intake: intake.trim() || undefined,
        courses: selectedCourses,
        stage: stage || defaultStage,
        status,
        priority,
        expectedRevenue: Number(expectedRevenue) || 0,
        actualRevenue: actualRevenue !== undefined ? Number(actualRevenue) : undefined,
        assignedStaffName: assignedStaffName.trim() || undefined,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate).toISOString() : undefined,
        lostReason: status === 'LOST' ? lostReason.trim() : undefined,
        notes: notes.trim() || undefined,
        customerId,
        contactId,
      };

      await onSave(payload, dealToEdit?.id);
      notify.success(
        isEditing
          ? 'Đã cập nhật cơ hội tuyển sinh!'
          : 'Đã tạo cơ hội tuyển sinh mới thành công!'
      );
      onClose();
    } catch (err: any) {
      notify.error(err?.message || 'Có lỗi xảy ra khi lưu cơ hội tuyển sinh.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================== */}
        {/* 1. HEADER MODAL - Phân tầng rõ rệt (Distinct Header) */}
        {/* ==================================================== */}
        <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100/90 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <Briefcase size={20} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">
                {isEditing ? 'Chỉnh Sửa Cơ Hội Tuyển Sinh' : 'Thêm Cơ Hội Tuyển Sinh Mới'}
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">
                Ứng viên:{' '}
                <span className="font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  {customerName}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
            title="Đóng cửa sổ"
          >
            <X size={18} />
          </button>
        </div>

        {/* ==================================================== */}
        {/* 2. BODY FORM - Khu vực nhập liệu cuộn độc lập       */}
        {/* ==================================================== */}
        <form
          id="deal-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4 text-xs bg-white custom-scrollbar"
        >
          {/* Nhóm 1: Tên Cơ Hội & Niên Khóa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="block font-semibold text-slate-700">
                Tên Cơ Hội / Đợt Tuyển Sinh <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Đăng ký Khóa Aptech 2026..."
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">Niên Khóa / Đợt</label>
              <input
                type="text"
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                placeholder="VD: K2026, Đợt 1..."
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Nhóm 2: Giai đoạn phễu & Trạng thái chốt */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">Giai Đoạn Phễu Tuyển Sinh</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {pipelineStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-slate-700">Trạng Thái Kết Quả</label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setStatus('OPEN')}
                  className={`h-8 flex items-center justify-center gap-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    status === 'OPEN'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <Clock size={12} />
                  <span>Đang xử lý</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('WON')}
                  className={`h-8 flex items-center justify-center gap-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    status === 'WON'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <CheckCircle2 size={12} />
                  <span>Thành công</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('LOST')}
                  className={`h-8 flex items-center justify-center gap-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                    status === 'LOST'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 font-semibold shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <XCircle size={12} />
                  <span>Thất bại</span>
                </button>
              </div>
            </div>
          </div>

          {/* Nếu LOST: Hiển thị lý do thất bại */}
          {status === 'LOST' && (
            <div className="space-y-1 p-3 rounded-lg bg-rose-50/70 border border-rose-200 animate-in fade-in">
              <label className="block font-semibold text-rose-800">Lý do thất bại / Hủy hồ sơ</label>
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
                <span>Khóa Học / Chương Trình Quan Tâm</span>
              </label>
              <span className="text-[11px] font-medium text-slate-500">
                Đã chọn: <strong className="text-blue-600">{selectedCourses.length}</strong> khóa
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
                placeholder="Nhập tên khóa học khác nếu không có trong danh mục..."
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
                <span>Học Phí Dự Kiến (VNĐ)</span>
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
                <span>Học Phí Thực Thu (VNĐ)</span>
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
                <span>Tư Vấn Viên Phụ Trách</span>
              </label>
              {staffList && staffList.length > 0 ? (
                <select
                  value={assignedStaffName}
                  onChange={(e) => setAssignedStaffName(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Chưa chỉ định --</option>
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
                <span>Mức Độ Ưu Tiên</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-8 px-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="LOW">Thấp (LOW)</option>
                <option value="MEDIUM">Bình thường (MEDIUM)</option>
                <option value="HIGH">Cao (HIGH)</option>
                <option value="URGENT">Khẩn cấp (URGENT)</option>
              </select>
            </div>
          </div>

          {/* Nhóm 6: Hạn chốt dự kiến */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700 flex items-center gap-1">
              <Calendar size={13} className="text-blue-500" />
              <span>Hạn Chốt Dự Kiến</span>
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
            <label className="block font-semibold text-slate-700">Ghi Chú Đợt Tuyển Sinh</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Ứng viên xin học bổng 20%, chờ điểm thi tốt nghiệp THPT..."
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
            Hủy
          </button>
          <button
            type="submit"
            form="deal-modal-form"
            disabled={isSubmitting}
            className="h-8.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 text-xs disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <Send size={12} />
                <span>{isEditing ? 'Cập Nhật Cơ Hội' : 'Tạo Cơ Hội'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
