import React, { useState, useEffect, useMemo } from 'react';
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
  Search,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client/index.js';
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
  customerPhone?: string;
  customerEmail?: string;
  workspaceId?: string;
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
  customerPhone = '',
  customerEmail = '',
  workspaceId,
  pipelineStages,
  catalog,
  staffList = [],
  onSave,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(dealToEdit);
  const isCustomerLocked = Boolean(_customerId && _customerId.trim());

  // Customer selection / input states
  const [customerMode, setCustomerMode] = useState<'SELECT' | 'NEW'>('SELECT');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerOptions, setCustomerOptions] = useState<
    Array<{ id: string; fullName: string; phone?: string | null; email?: string | null }>
  >([]);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentPhone, setStudentPhone] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');

  // Deal Form fields
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

  // Tải danh sách khách hàng / học viên từ Workspace nếu không bị khóa
  useEffect(() => {
    if (isOpen && workspaceId && !isCustomerLocked) {
      apiClient
        .getCustomers({ workspaceId, limit: 100 } as any)
        .then((res: any) => {
          const items = res?.items || (Array.isArray(res) ? res : []);
          setCustomerOptions(items);
        })
        .catch((err) => {
          console.warn('Lỗi tải danh sách học viên trong DealModal:', err);
        });
    }
  }, [isOpen, workspaceId, isCustomerLocked]);

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

        const existingCustId = dealToEdit.customerId || _customerId || '';
        const existingCustName =
          dealToEdit.customer?.fullName || dealToEdit.contact?.displayName || customerName || '';
        const existingCustPhone =
          dealToEdit.customer?.phone || dealToEdit.contact?.phoneNormalized || customerPhone || '';
        const existingCustEmail =
          dealToEdit.customer?.email || dealToEdit.contact?.email || customerEmail || '';

        setSelectedCustomerId(existingCustId);
        setStudentName(existingCustName);
        setStudentPhone(existingCustPhone);
        setStudentEmail(existingCustEmail);
        setCustomerMode(existingCustId ? 'SELECT' : existingCustName ? 'NEW' : 'SELECT');
      } else {
        // Mặc định tạo mới
        const initCustId = _customerId || '';
        const initCustName = _customerId ? (customerName || '') : '';
        const initCustPhone = _customerId ? (customerPhone || '') : '';
        const initCustEmail = _customerId ? (customerEmail || '') : '';

        setSelectedCustomerId(initCustId);
        setStudentName(initCustName);
        setStudentPhone(initCustPhone);
        setStudentEmail(initCustEmail);
        setCustomerMode('SELECT');
        setCustomerSearch('');

        const defaultCourse = catalog[0]?.name;
        const defaultPrice = catalog[0]?.defaultPrice || 0;
        const displayNameForTitle = initCustName || 'Học viên';
        setTitle(
          defaultCourse
            ? `${defaultCourse} - ${displayNameForTitle}`
            : `Cơ hội tuyển sinh - ${displayNameForTitle}`
        );
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
  }, [
    isOpen,
    dealToEdit,
    _customerId,
    customerName,
    customerPhone,
    customerEmail,
    pipelineStages,
    catalog,
    staffList,
  ]);

  // Lọc danh sách học viên theo ô tìm kiếm
  const filteredCustomerOptions = useMemo(() => {
    if (!customerSearch.trim()) return customerOptions;
    const q = customerSearch.trim().toLowerCase();
    return customerOptions.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customerOptions, customerSearch]);

  const selectedCustomerDetails = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customerOptions.find((c) => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customerOptions]);

  const effectiveCustomerName =
    studentName.trim() ||
    selectedCustomerDetails?.fullName ||
    (customerName !== 'Ứng viên' ? customerName : '') ||
    'Học viên';

  // Khi người dùng chọn một học viên từ danh mục có sẵn
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customerOptions.find((c) => c.id === custId);
    if (found) {
      setStudentName(found.fullName);
      setStudentPhone(found.phone || '');
      setStudentEmail(found.email || '');

      const coursePrefix = selectedCourses[0] || catalog[0]?.name || 'Cơ hội tuyển sinh';
      if (!title || title.includes(' - ') || title === 'Cơ hội tuyển sinh') {
        setTitle(`${coursePrefix} - ${found.fullName}`);
      }
    }
  };

  // Khi người dùng gõ tên học viên ở chế độ tạo mới
  const handleStudentNameChange = (newName: string) => {
    setStudentName(newName);
    const coursePrefix = selectedCourses[0] || catalog[0]?.name || 'Cơ hội tuyển sinh';
    if (!title || title.includes(' - ') || title === 'Cơ hội tuyển sinh') {
      setTitle(`${coursePrefix} - ${newName.trim() || 'Học viên'}`);
    }
  };

  // Tự động tính tổng học phí dự kiến khi chọn/bỏ chọn khóa học từ Catalog
  const handleToggleCourse = (courseName: string) => {
    let newSelected: string[];
    if (selectedCourses.includes(courseName)) {
      newSelected = selectedCourses.filter((c) => c !== courseName);
    } else {
      newSelected = [...selectedCourses, courseName];
    }
    setSelectedCourses(newSelected);

    // Cập nhật lại title nếu theo format Course - Student
    const firstCourse = newSelected[0];
    if (firstCourse && (title.includes(' - ') || !title)) {
      setTitle(`${firstCourse} - ${effectiveCustomerName}`);
    }

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
      const newSelected = [...selectedCourses, trimmed];
      setSelectedCourses(newSelected);
      if (newSelected.length === 1 && (title.includes(' - ') || !title)) {
        setTitle(`${trimmed} - ${effectiveCustomerName}`);
      }
    }
    setCustomCourseInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Kiểm tra thông tin học viên nếu không bị khóa
    if (!isCustomerLocked) {
      if (customerMode === 'SELECT' && !selectedCustomerId && customerOptions.length > 0) {
        notify.warning(
          t(
            'deals.selectCustomerWarning',
            'Vui lòng chọn học viên từ danh sách hoặc chuyển sang "+ Nhập mới"'
          )
        );
        return;
      }
      if (customerMode === 'NEW' && !studentName.trim()) {
        notify.warning(
          t('deals.enterCustomerNameWarning', 'Vui lòng nhập họ và tên của học viên')
        );
        return;
      }
    }

    if (!title.trim()) {
      notify.warning(t('deals.titlePlaceholder', 'Vui lòng nhập tên cơ hội tuyển sinh'));
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: CreateDealPayload | UpdateDealPayload = {
        customerId: selectedCustomerId || _customerId || undefined,
        customerName: studentName.trim() || undefined,
        customerPhone: studentPhone.trim() || undefined,
        customerEmail: studentEmail.trim() || undefined,
        title: title.trim(),
        courses: selectedCourses,
        intake: intake.trim() || undefined,
        stage: stage || pipelineStages[0]?.id || 'STAGE_NEW',
        status,
        priority,
        expectedRevenue: Number(expectedRevenue) || 0,
        actualRevenue:
          status === 'WON'
            ? actualRevenue !== undefined
              ? Number(actualRevenue)
              : Number(expectedRevenue)
            : actualRevenue,
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
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-800 truncate">
                {isEditing
                  ? t('deals.dealModalEditTitle', 'Cập nhật Dịch vụ / Đợt Tuyển Sinh')
                  : t('deals.dealModalCreateTitle', 'Ghi nhận Dịch vụ / Đợt Tuyển Sinh mới')}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                <span className="font-semibold text-slate-700">{effectiveCustomerName}</span> •{' '}
                {isEditing
                  ? t('common.edit', 'Chỉnh sửa thông tin')
                  : t('deals.createFirstDealBtn', 'Ghi nhận khóa học / đợt mới')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0 ml-2"
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
          {/* ==================================================== */}
          {/* KHỐI 1: THÔNG TIN HỌC VIÊN / KHÁCH HÀNG              */}
          {/* ==================================================== */}
          {isCustomerLocked ? (
            <div className="p-3 bg-blue-50/70 border border-blue-200/90 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs shrink-0">
                  {effectiveCustomerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      {effectiveCustomerName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-200 shrink-0">
                      Hồ sơ liên kết
                    </span>
                  </div>
                  {(studentPhone || studentEmail) && (
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3 mt-0.5 truncate">
                      {studentPhone && <span>SĐT: {studentPhone}</span>}
                      {studentEmail && <span>• Email: {studentEmail}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <User size={14} className="text-blue-600" />
                  <span>
                    {t('deals.studentInfoLabel', 'Thông tin Học viên / Khách hàng')}{' '}
                    <span className="text-rose-500">*</span>
                  </span>
                </label>
                <div className="inline-flex p-0.5 bg-slate-200/80 rounded-lg text-[11px] self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('SELECT')}
                    className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      customerMode === 'SELECT'
                        ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('deals.selectExistingStudent', 'Chọn học viên có sẵn')}{' '}
                    {customerOptions.length > 0 ? `(${customerOptions.length})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerMode('NEW');
                      setSelectedCustomerId('');
                    }}
                    className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                      customerMode === 'NEW'
                        ? 'bg-white text-blue-700 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + {t('deals.createNewStudent', 'Nhập học viên mới')}
                  </button>
                </div>
              </div>

              {customerMode === 'SELECT' ? (
                <div className="space-y-2">
                  {customerOptions.length > 5 && (
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Tìm học viên theo tên, SĐT hoặc Email..."
                        className="w-full h-7.5 pl-8 pr-2.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">
                      -- Chọn học viên từ danh sách CRM ({filteredCustomerOptions.length}) --
                    </option>
                    {filteredCustomerOptions.map((cust) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.fullName} {cust.phone ? `(${cust.phone})` : ''}{' '}
                        {cust.email ? `- ${cust.email}` : ''}
                      </option>
                    ))}
                  </select>

                  {selectedCustomerDetails && (
                    <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/60 flex items-center justify-between text-xs animate-in fade-in">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {selectedCustomerDetails.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 truncate">
                          <strong className="text-slate-800">
                            {selectedCustomerDetails.fullName}
                          </strong>
                          {(selectedCustomerDetails.phone || selectedCustomerDetails.email) && (
                            <span className="text-slate-500 text-[11px] ml-2">
                              {selectedCustomerDetails.phone &&
                                `SĐT: ${selectedCustomerDetails.phone}`}
                              {selectedCustomerDetails.email &&
                                ` • ${selectedCustomerDetails.email}`}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 shrink-0 ml-2">
                        <CheckCircle2 size={12} /> Đã chọn
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Họ và tên học viên <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={customerMode === 'NEW'}
                        value={studentName}
                        onChange={(e) => handleStudentNameChange(e.target.value)}
                        placeholder="VD: Nguyễn Văn A..."
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value)}
                        placeholder="VD: 0912345678"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Email liên hệ
                      </label>
                      <input
                        type="email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        placeholder="VD: hocvien@gmail.com"
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Hệ thống sẽ tự động liên kết hoặc tạo mới hồ sơ học viên vào CRM khi lưu.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* KHỐI 2: Tên đợt/dịch vụ & Niên khóa                  */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <label className="block font-semibold text-slate-700">
                {t('deals.titleLabel', 'Tên đợt tuyển sinh / Khóa học')}{' '}
                <span className="text-rose-500">*</span>
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
              <label className="block font-semibold text-slate-700">
                {t('deals.intakeLabel', 'Niên Khóa / Đợt')}
              </label>
              <input
                type="text"
                value={intake}
                onChange={(e) => setIntake(e.target.value)}
                placeholder={t('deals.intakePlaceholder', 'VD: K2026, Đợt 1...')}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ==================================================== */}
          {/* KHỐI 3: Trạng thái dịch vụ                          */}
          {/* ==================================================== */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">
              {t('deals.statusLabel', 'Trạng Thái Dịch Vụ')}
            </label>
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
              <label className="block font-semibold text-rose-800">
                {t('deals.lostReasonLabel', 'Lý do thất bại / Hủy hồ sơ')}
              </label>
              <input
                type="text"
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="VD: Không đủ học phí, Trùng lịch học trường khác..."
                className="w-full h-8 px-2.5 rounded-lg border border-rose-300 text-xs text-rose-900 bg-white focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {/* ==================================================== */}
          {/* KHỐI 4: Khóa học quan tâm                           */}
          {/* ==================================================== */}
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
                placeholder={t(
                  'deals.coursesPlaceholder',
                  'Nhập tên khóa học khác nếu không có trong danh mục...'
                )}
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

          {/* ==================================================== */}
          {/* KHỐI 5: Học phí dự kiến & Thực tế                   */}
          {/* ==================================================== */}
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

          {/* ==================================================== */}
          {/* KHỐI 6: Chuyên viên phụ trách & Độ ưu tiên           */}
          {/* ==================================================== */}
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

          {/* ==================================================== */}
          {/* KHỐI 7: Hạn chốt dự kiến                            */}
          {/* ==================================================== */}
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

          {/* ==================================================== */}
          {/* KHỐI 8: Ghi chú tuyển sinh                          */}
          {/* ==================================================== */}
          <div className="space-y-1">
            <label className="block font-semibold text-slate-700">
              {t('deals.notesLabel', 'Ghi Chú Đợt Tuyển Sinh')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                'deals.notesPlaceholder',
                'VD: Ứng viên xin học bổng 20%, chờ điểm thi tốt nghiệp THPT...'
              )}
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
                <span>
                  {isEditing
                    ? t('deals.dealModalEditTitle', 'Cập Nhật Cơ Hội')
                    : t('deals.saveDealBtn', 'Tạo Cơ Hội')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
