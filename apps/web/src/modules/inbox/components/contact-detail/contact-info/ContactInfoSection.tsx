import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  PenLine,
  Phone,
  Mail,
  Plus,
  AlertCircle,
  CreditCard,
  GraduationCap,
  Calendar,
  MapPin,
} from 'lucide-react';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { Button } from '../../../../../components/ui/Button.js';
import { Modal } from '../../../../../components/ui/Modal.js';
import {
  standardizeVietnamesePhoneNumber,
  formatVietnamesePhoneNumber,
} from '../../../../../lib/phone.js';

interface ContactInfoSectionProps {
  phone?: string;
  email?: string;
  idCard?: string;
  school?: string;
  address?: string;
  dateOfBirth?: string;
  channelAccountName?: string;
  contactId?: string;
  copiedField: string | null;
  onCopy: (text: string, fieldName: string) => void;
  onUpdateContactInfo?: (info: {
    phone?: string;
    email?: string;
    fullName?: string;
    idCard?: string;
    school?: string;
    address?: string;
    dateOfBirth?: string;
  }) => void;
  isEditingPhoneExternal?: boolean;
  onResetEditingPhoneExternal?: () => void;
  isEditingEmailExternal?: boolean;
  onResetEditingEmailExternal?: () => void;
}

export const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({
  phone,
  email,
  idCard,
  school,
  address,
  dateOfBirth,
  copiedField,
  onCopy,
  onUpdateContactInfo,
  isEditingPhoneExternal = false,
  onResetEditingPhoneExternal,
  isEditingEmailExternal = false,
  onResetEditingEmailExternal,
}) => {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isEditingIdCard, setIsEditingIdCard] = useState(false);
  const [idCardInput, setIdCardInput] = useState('');
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [schoolInput, setSchoolInput] = useState('');
  const [isEditingDob, setIsEditingDob] = useState(false);
  const [dobInput, setDobInput] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState('');

  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);

  // Đồng bộ giá trị khởi tạo
  useEffect(() => {
    setPhoneInput(phone && phone !== 'Chưa có SĐT' ? phone : '');
    setEmailInput(email && email !== 'Chưa có Email' ? email : '');
    setIdCardInput(idCard || '');
    setSchoolInput(school || '');
    setDobInput(dateOfBirth || '');
    setAddressInput(address || '');
    setIsEditingPhone(false);
    setIsEditingEmail(false);
    setIsEditingIdCard(false);
    setIsEditingSchool(false);
    setIsEditingDob(false);
    setIsEditingAddress(false);
  }, [phone, email, idCard, school, dateOfBirth, address]);

  // Phản hồi trigger sửa từ nút header ("Gọi ngay" / "Gửi Mail")
  useEffect(() => {
    if (isEditingPhoneExternal) {
      setIsEditingPhone(true);
      if (onResetEditingPhoneExternal) onResetEditingPhoneExternal();
    }
  }, [isEditingPhoneExternal, onResetEditingPhoneExternal]);

  useEffect(() => {
    if (isEditingEmailExternal) {
      setIsEditingEmail(true);
      if (onResetEditingEmailExternal) onResetEditingEmailExternal();
    }
  }, [isEditingEmailExternal, onResetEditingEmailExternal]);

  const handleSavePhone = () => {
    const trimmed = phoneInput.trim();
    if (!trimmed) {
      if (onUpdateContactInfo) {
        onUpdateContactInfo({ phone: '' });
      }
      notify.success('Đã xóa số điện thoại');
      setIsEditingPhone(false);
      return;
    }

    const standardized = standardizeVietnamesePhoneNumber(trimmed);
    if (!standardized) {
      notify.error('Số điện thoại không hợp lệ (yêu cầu đúng 10 chữ số)!');
      return;
    }

    if (onUpdateContactInfo) {
      onUpdateContactInfo({ phone: standardized });
    }
    notify.success(`Đã lưu: ${standardized}`);
    setIsEditingPhone(false);
  };

  const handleSaveEmail = () => {
    const trimmed = emailInput.trim();
    if (onUpdateContactInfo) {
      onUpdateContactInfo({ email: trimmed });
    }
    notify.success(trimmed ? 'Đã lưu email!' : 'Đã xóa email');
    setIsEditingEmail(false);
  };

  const handleSaveIdCard = () => {
    const trimmed = idCardInput.trim();
    if (onUpdateContactInfo) {
      onUpdateContactInfo({ idCard: trimmed });
    }
    notify.success(trimmed ? 'Đã lưu CCCD/CMND!' : 'Đã xóa CCCD/CMND');
    setIsEditingIdCard(false);
  };

  const handleSaveSchool = () => {
    const trimmed = schoolInput.trim();
    if (onUpdateContactInfo) {
      onUpdateContactInfo({ school: trimmed });
    }
    notify.success(trimmed ? 'Đã lưu thông tin trường!' : 'Đã xóa thông tin trường');
    setIsEditingSchool(false);
  };

  const handleSaveDob = () => {
    const trimmed = dobInput.trim();
    if (onUpdateContactInfo) {
      onUpdateContactInfo({ dateOfBirth: trimmed });
    }
    notify.success(trimmed ? 'Đã lưu ngày sinh!' : 'Đã xóa ngày sinh');
    setIsEditingDob(false);
  };

  const handleSaveAddress = () => {
    const trimmed = addressInput.trim();
    if (onUpdateContactInfo) {
      onUpdateContactInfo({ address: trimmed });
    }
    notify.success(trimmed ? 'Đã lưu địa chỉ!' : 'Đã xóa địa chỉ');
    setIsEditingAddress(false);
  };

  const hasPhone = Boolean(phone && phone !== 'Chưa có SĐT');
  const hasEmail = Boolean(email && email !== 'Chưa có Email');
  const hasIdCard = Boolean(idCard && idCard.trim());
  const hasSchool = Boolean(school && school.trim());
  const hasDob = Boolean(dateOfBirth && dateOfBirth.trim());
  const hasAddress = Boolean(address && address.trim());

  return (
    <div className="p-4 bg-white space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 shrink-0">
          <h4 className="m-0 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Hồ Sơ Cá Nhân (Contact)
          </h4>
          <button
            type="button"
            onClick={() => setIsExplainModalOpen(true)}
            className="inline-flex items-center justify-center p-0.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer rounded"
            title="Xem giải thích hồ sơ cá nhân"
            aria-label="Giải thích hồ sơ cá nhân"
          >
            <AlertCircle size={13} />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {/* 1. SỐ ĐIỆN THOẠI */}
        <div className="group flex items-center justify-between text-xs py-1 rounded hover:bg-slate-50 px-1 -mx-1 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 shrink-0">
            <Phone size={13} className="text-slate-400" />
            <span>SĐT:</span>
          </div>

          {isEditingPhone ? (
            <div className="flex items-center gap-1.5 flex-1 justify-end ml-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePhone();
                  if (e.key === 'Escape') setIsEditingPhone(false);
                }}
                placeholder="0939..."
                autoFocus
                className="h-6 px-2 text-xs border border-blue-500 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSavePhone}
                className="h-6 px-1.5 text-[11px]"
              >
                Lưu
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingPhone(false)}
                className="h-6 px-1.5 text-[11px]"
              >
                Hủy
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 justify-end flex-1 min-w-0 ml-2">
              <span
                className={`truncate font-medium ${
                  hasPhone ? 'text-slate-800' : 'text-slate-400 italic'
                }`}
              >
                {hasPhone ? formatVietnamesePhoneNumber(phone, 'space') || phone : 'Chưa có'}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {hasPhone && (
                  <button
                    type="button"
                    onClick={() => onCopy(phone!, 'Số điện thoại')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    title="Sao chép SĐT"
                  >
                    {copiedField === 'Số điện thoại' ? (
                      <Check size={11} className="text-emerald-600" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPhoneInput(hasPhone ? phone! : '');
                    setIsEditingPhone(true);
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  title={hasPhone ? 'Sửa SĐT' : 'Thêm SĐT'}
                >
                  {hasPhone ? <PenLine size={11} /> : <Plus size={11} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. EMAIL */}
        <div className="group flex items-center justify-between text-xs py-1 rounded hover:bg-slate-50 px-1 -mx-1 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 shrink-0">
            <Mail size={13} className="text-slate-400" />
            <span>Email:</span>
          </div>

          {isEditingEmail ? (
            <div className="flex items-center gap-1.5 flex-1 justify-end ml-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEmail();
                  if (e.key === 'Escape') setIsEditingEmail(false);
                }}
                placeholder="email@example.com"
                autoFocus
                className="h-6 px-2 text-xs border border-blue-500 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveEmail}
                className="h-6 px-1.5 text-[11px]"
              >
                Lưu
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingEmail(false)}
                className="h-6 px-1.5 text-[11px]"
              >
                Hủy
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 justify-end flex-1 min-w-0 ml-2">
              <span
                className={`truncate font-medium ${
                  hasEmail ? 'text-slate-800' : 'text-slate-400 italic'
                }`}
                title={hasEmail ? email : undefined}
              >
                {hasEmail ? email : 'Chưa có'}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {hasEmail && (
                  <button
                    type="button"
                    onClick={() => onCopy(email!, 'Email')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    title="Sao chép Email"
                  >
                    {copiedField === 'Email' ? (
                      <Check size={11} className="text-emerald-600" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEmailInput(hasEmail ? email! : '');
                    setIsEditingEmail(true);
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  title={hasEmail ? 'Sửa Email' : 'Thêm Email'}
                >
                  {hasEmail ? <PenLine size={11} /> : <Plus size={11} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 3. CMND / CCCD */}
        <div className="group flex items-center justify-between text-xs py-1 rounded hover:bg-slate-50 px-1 -mx-1 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 shrink-0">
            <CreditCard size={13} className="text-slate-400" />
            <span>CCCD:</span>
          </div>

          {isEditingIdCard ? (
            <div className="flex items-center gap-1.5 flex-1 justify-end ml-2">
              <input
                type="text"
                value={idCardInput}
                onChange={(e) => setIdCardInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveIdCard();
                  if (e.key === 'Escape') setIsEditingIdCard(false);
                }}
                placeholder="12 số CCCD..."
                autoFocus
                className="h-6 px-2 text-xs border border-blue-500 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveIdCard}
                className="h-6 px-1.5 text-[11px]"
              >
                Lưu
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingIdCard(false)}
                className="h-6 px-1.5 text-[11px]"
              >
                Hủy
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 justify-end flex-1 min-w-0 ml-2">
              <span
                className={`truncate font-medium ${
                  hasIdCard ? 'text-slate-800 font-mono' : 'text-slate-400 italic'
                }`}
                title={hasIdCard ? idCard : undefined}
              >
                {hasIdCard ? idCard : 'Chưa có'}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {hasIdCard && (
                  <button
                    type="button"
                    onClick={() => onCopy(idCard!, 'CCCD/CMND')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    title="Sao chép CCCD"
                  >
                    {copiedField === 'CCCD/CMND' ? (
                      <Check size={11} className="text-emerald-600" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIdCardInput(hasIdCard ? idCard! : '');
                    setIsEditingIdCard(true);
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  title={hasIdCard ? 'Sửa CCCD' : 'Thêm CCCD'}
                >
                  {hasIdCard ? <PenLine size={11} /> : <Plus size={11} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. TRƯỜNG THPT / ĐẠI HỌC */}
        <div className="group flex items-center justify-between text-xs py-1 rounded hover:bg-slate-50 px-1 -mx-1 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 shrink-0">
            <GraduationCap size={13} className="text-slate-400" />
            <span>Trường:</span>
          </div>

          {isEditingSchool ? (
            <div className="flex items-center gap-1.5 flex-1 justify-end ml-2">
              <input
                type="text"
                value={schoolInput}
                onChange={(e) => setSchoolInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSchool();
                  if (e.key === 'Escape') setIsEditingSchool(false);
                }}
                placeholder="VD: THPT Châu Văn Liêm..."
                autoFocus
                className="h-6 px-2 text-xs border border-blue-500 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveSchool}
                className="h-6 px-1.5 text-[11px]"
              >
                Lưu
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingSchool(false)}
                className="h-6 px-1.5 text-[11px]"
              >
                Hủy
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 justify-end flex-1 min-w-0 ml-2">
              <span
                className={`truncate font-medium ${
                  hasSchool ? 'text-slate-800' : 'text-slate-400 italic'
                }`}
                title={hasSchool ? school : undefined}
              >
                {hasSchool ? school : 'Chưa có'}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {hasSchool && (
                  <button
                    type="button"
                    onClick={() => onCopy(school!, 'Trường THPT/ĐH')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    title="Sao chép Trường"
                  >
                    {copiedField === 'Trường THPT/ĐH' ? (
                      <Check size={11} className="text-emerald-600" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSchoolInput(hasSchool ? school! : '');
                    setIsEditingSchool(true);
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  title={hasSchool ? 'Sửa Trường' : 'Thêm Trường'}
                >
                  {hasSchool ? <PenLine size={11} /> : <Plus size={11} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 5. NGÀY SINH */}
        <div className="group flex items-center justify-between text-xs py-1 rounded hover:bg-slate-50 px-1 -mx-1 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 shrink-0">
            <Calendar size={13} className="text-slate-400" />
            <span>Ngày sinh:</span>
          </div>

          {isEditingDob ? (
            <div className="flex items-center gap-1.5 flex-1 justify-end ml-2">
              <input
                type="date"
                value={dobInput}
                onChange={(e) => setDobInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDob();
                  if (e.key === 'Escape') setIsEditingDob(false);
                }}
                autoFocus
                className="h-6 px-1.5 text-xs border border-blue-500 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveDob}
                className="h-6 px-1.5 text-[11px]"
              >
                Lưu
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingDob(false)}
                className="h-6 px-1.5 text-[11px]"
              >
                Hủy
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 justify-end flex-1 min-w-0 ml-2">
              <span
                className={`truncate font-medium ${
                  hasDob ? 'text-slate-800' : 'text-slate-400 italic'
                }`}
                title={hasDob ? dateOfBirth : undefined}
              >
                {hasDob ? dateOfBirth : 'Chưa có'}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => {
                    setDobInput(hasDob ? dateOfBirth! : '');
                    setIsEditingDob(true);
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  title={hasDob ? 'Sửa Ngày sinh' : 'Thêm Ngày sinh'}
                >
                  {hasDob ? <PenLine size={11} /> : <Plus size={11} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 6. ĐỊA CHỈ */}
        <div className="group flex items-center justify-between text-xs py-1 rounded hover:bg-slate-50 px-1 -mx-1 transition-colors">
          <div className="flex items-center gap-2 text-slate-500 shrink-0">
            <MapPin size={13} className="text-slate-400" />
            <span>Địa chỉ:</span>
          </div>

          {isEditingAddress ? (
            <div className="flex items-center gap-1.5 flex-1 justify-end ml-2">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAddress();
                  if (e.key === 'Escape') setIsEditingAddress(false);
                }}
                placeholder="VD: Cần Thơ, Hậu Giang..."
                autoFocus
                className="h-6 px-2 text-xs border border-blue-500 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveAddress}
                className="h-6 px-1.5 text-[11px]"
              >
                Lưu
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingAddress(false)}
                className="h-6 px-1.5 text-[11px]"
              >
                Hủy
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 justify-end flex-1 min-w-0 ml-2">
              <span
                className={`truncate font-medium ${
                  hasAddress ? 'text-slate-800' : 'text-slate-400 italic'
                }`}
                title={hasAddress ? address : undefined}
              >
                {hasAddress ? address : 'Chưa có'}
              </span>

              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {hasAddress && (
                  <button
                    type="button"
                    onClick={() => onCopy(address!, 'Địa chỉ')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    title="Sao chép Địa chỉ"
                  >
                    {copiedField === 'Địa chỉ' ? (
                      <Check size={11} className="text-emerald-600" />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAddressInput(hasAddress ? address! : '');
                    setIsEditingAddress(true);
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  title={hasAddress ? 'Sửa Địa chỉ' : 'Thêm Địa chỉ'}
                >
                  {hasAddress ? <PenLine size={11} /> : <Plus size={11} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Giải thích Hồ Sơ Cá Nhân */}
      <Modal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
        title="Chuẩn Hồ Sơ Khách Hàng (Contact Profile)"
        size="md"
        showCloseButton={true}
        primaryAction={{
          label: 'Đã hiểu',
          onClick: () => setIsExplainModalOpen(false),
          variant: 'primary',
        }}
      >
        <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
          <div className="space-y-1">
            <h5 className="m-0 font-semibold text-slate-900 text-xs">
              1. Hồ sơ cá nhân (Contact) cố định & không bị ghi đè
            </h5>
            <p className="m-0 text-slate-600">
              Theo chuẩn CRM HubSpot/Salesforce, hồ sơ cá nhân lưu trữ định danh xuyên suốt của học viên (Họ tên, SĐT, Email, CCCD, Trường học, Ngày sinh). Dữ liệu này được bảo toàn khi học viên đăng ký nhiều khóa học hoặc nhiều niên khóa khác nhau.
            </p>
          </div>

          <div className="space-y-1">
            <h5 className="m-0 font-semibold text-slate-900 text-xs">
              2. Cơ hội tuyển sinh (Deals / Opportunities) độc lập
            </h5>
            <p className="m-0 text-slate-600">
              Mỗi đợt ứng viên đăng ký học (VD: Lập trình Web ngắn hạn 2025, Aptech Quốc tế 2026) được quản lý như một Deal độc lập với phễu tuyển sinh, học phí và tư vấn viên phụ trách riêng biệt.
            </p>
          </div>

          <div className="space-y-1">
            <h5 className="m-0 font-semibold text-slate-900 text-xs">
              3. Định danh & Tự động hợp nhất
            </h5>
            <p className="m-0 text-slate-600">
              Hệ thống tự động liên kết đa kênh qua Số điện thoại hoặc CCCD, giúp tư vấn viên luôn nắm trọn vẹn hành trình của ứng viên.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};