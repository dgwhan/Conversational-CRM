import React, { useState, useMemo } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { Modal, Toggle, SearchableSelect } from '../../../../../../components/ui/index.js';
import { notify } from '../../../../../../components/feedback/toastEmitter.js';
import { apiClient } from '../../../../../../lib/api-client/index.js';
import { parseBulkKeywordText } from './rules/utils.js';

export interface KeywordBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGroups: string[];
  defaultGroup?: string;
  onSuccess: () => Promise<boolean | void>;
}

export const KeywordBulkImportModal: React.FC<KeywordBulkImportModalProps> = ({
  isOpen,
  onClose,
  availableGroups,
  defaultGroup,
  onSuccess,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>(() => defaultGroup || availableGroups[0] || 'Quan tâm học phí');
  const [isCustomGroup, setIsCustomGroup] = useState(false);
  const [customGroupName, setCustomGroupName] = useState('');
  const [weight, setWeight] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [rawText, setRawText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Parse keywords from raw text (split by newlines and commas)
  const parsedKeywords = useMemo(() => {
    return parseBulkKeywordText(rawText);
  }, [rawText]);

  const targetGroup = isCustomGroup ? customGroupName.trim() : selectedGroup;

  const handleImport = async () => {
    if (!targetGroup) {
      notify.error('Vui lòng chọn hoặc nhập tên nhóm cho từ khóa.');
      return;
    }
    if (parsedKeywords.length === 0) {
      notify.error('Vui lòng nhập ít nhất một từ khóa hợp lệ.');
      return;
    }

    setIsImporting(true);
    try {
      const itemsToCreate = parsedKeywords.map((kw) => ({
        group: targetGroup,
        keyword: kw,
        weight: Number(weight) || 1,
        isActive,
      }));

      // Use bulk endpoint if available, fallback to chunked creation
      try {
        await apiClient.createKeywordRulesBulk(itemsToCreate);
      } catch {
        // Fallback: chunked create via standard endpoint
        const CHUNK_SIZE = 10;
        for (let i = 0; i < itemsToCreate.length; i += CHUNK_SIZE) {
          const chunk = itemsToCreate.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map((item) => apiClient.createKeywordRule(item)));
        }
      }

      notify.success(`Đã nhập thành công ${parsedKeywords.length} từ khóa vào nhóm "${targetGroup}".`);
      setRawText('');
      onClose();
      await onSuccess();
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Không thể nhập từ khóa hàng loạt.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isImporting ? undefined : onClose}
      size="md"
      showCloseButton
      title={
        <div className="flex items-center gap-2">
          <Upload size={18} className="text-blue-600 shrink-0" />
          <span className="text-base font-semibold text-slate-900">Nhập từ khóa chấm điểm hàng loạt</span>
        </div>
      }
      description={
        <span className="text-xs text-slate-500">
          Dán danh sách từ khóa phân tách bằng dấu phẩy hoặc mỗi từ một dòng để thêm nhanh vào hệ thống.
        </span>
      }
    >
      <div className="space-y-4 pt-2">
        {/* Chọn hoặc tạo nhóm */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nhóm từ khóa <span className="text-rose-500">*</span>
            </label>
            {!isCustomGroup ? (
              <div className="space-y-1.5">
                <SearchableSelect
                  value={selectedGroup}
                  onChange={(val) => {
                    if (val === '__NEW__') {
                      setIsCustomGroup(true);
                    } else {
                      setSelectedGroup(val);
                    }
                  }}
                  options={[
                    ...availableGroups.map((g) => ({ value: g, label: g })),
                    { value: '__NEW__', label: '+ Tạo nhóm mới...' },
                  ]}
                  placeholder="Chọn nhóm từ khóa..."
                  searchPlaceholder="Tìm kiếm nhóm..."
                  size="md"
                  fullWidth
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Nhập tên nhóm mới..."
                    value={customGroupName}
                    onChange={(e) => setCustomGroupName(e.target.value)}
                    maxLength={50}
                    autoFocus
                    className="flex-1 h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomGroup(false);
                      setCustomGroupName('');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 underline px-1 py-1 cursor-pointer bg-transparent border-none shrink-0"
                  >
                    Chọn có sẵn
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Thiết lập điểm & trạng thái mặc định */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Trọng số mặc định</label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Bật ngay:</span>
                <Toggle
                  checked={isActive}
                  onChange={setIsActive}
                  size="sm"
                  aria-label="Kích hoạt từ khóa ngay khi nhập"
                />
              </div>
            </div>
            <input
              type="number"
              step="1"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              placeholder="Điểm (+1, +10, -5)"
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all"
            />
          </div>
        </div>

        {/* Textarea nhập từ khóa */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Danh sách từ khóa <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
              Đã nhận diện: {parsedKeywords.length} từ khóa
            </span>
          </div>
          <textarea
            rows={7}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`học phí, học bổng, cơ sở đào tạo, lịch khai giảng\nchương trình cử nhân\nhẹn tư vấn trực tiếp\n(Dán hàng chục hoặc hàng trăm từ khóa vào đây...)`}
            className="w-full rounded-md border border-slate-300 bg-white p-3 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition-all resize-y"
          />
          <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-slate-500">
            <AlertCircle size={13} className="text-slate-400 shrink-0 mt-0.5" />
            <span>
              Hệ thống tự động tách từ theo dấu phẩy hoặc xuống dòng, loại bỏ khoảng trắng thừa và lọc trùng lặp tự động.
            </span>
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="h-9 px-3.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer border-none"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || parsedKeywords.length === 0}
            className="inline-flex flex-row items-center justify-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer border-none shadow-2xs disabled:opacity-50 whitespace-nowrap"
          >
            {isImporting ? (
              <>
                <Loader2 size={14} className="animate-spin shrink-0" />
                <span>Đang nhập dữ liệu...</span>
              </>
            ) : (
              <>
                <Upload size={14} className="shrink-0" />
                <span>Nhập {parsedKeywords.length > 0 ? `${parsedKeywords.length} từ khóa` : 'hàng loạt'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

