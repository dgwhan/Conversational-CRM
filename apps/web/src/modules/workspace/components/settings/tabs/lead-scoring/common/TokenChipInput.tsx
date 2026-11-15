import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';

export interface TokenChipInputProps {
  tokens: string[];
  onChange: (newTokens: string[]) => void;
  placeholder?: string;
  presets?: string[];
  disabled?: boolean;
}

/**
 * Component Chip Input nhập mảng chuỗi với input borderless đặt liền mạch sau chip.
 * Hỗ trợ nhấn Enter hoặc dấu phẩy để thêm, lọc trùng lặp tự động và gợi ý nhanh thông minh.
 */
export const TokenChipInput: React.FC<TokenChipInputProps> = ({
  tokens,
  onChange,
  placeholder = 'Nhập từ khóa rồi nhấn Enter...',
  presets = [],
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  const normalizedTokens = useMemo(() => {
    return new Set(tokens.map((t) => t.trim().toLowerCase()));
  }, [tokens]);

  const handleAddToken = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!normalizedTokens.has(trimmed.toLowerCase())) {
      onChange([...tokens, trimmed]);
    }
    setInputValue('');
  };

  const handleRemoveToken = (indexToRemove: number) => {
    if (disabled) return;
    onChange(tokens.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddToken(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tokens.length > 0) {
      handleRemoveToken(tokens.length - 1);
    }
  };

  // Ẩn các từ gợi ý đã tồn tại trong danh sách
  const availablePresets = useMemo(() => {
    return presets.filter(
      (preset) => !normalizedTokens.has(preset.trim().toLowerCase()),
    );
  }, [presets, normalizedTokens]);

  return (
    <div className="space-y-2">
      {/* Container soft-filled: border-transparent, focus-within chuyển trắng viền xanh */}
      <div
        className={`bg-slate-100/80 rounded-md p-2.5 flex flex-wrap items-center gap-1.5 transition-all border border-transparent ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 hover:bg-slate-100/90'
        }`}
      >
        {tokens.map((token, index) => (
          <span
            key={`${token}-${index}`}
            className="inline-flex items-center gap-1.5 rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs border border-slate-200/70"
          >
            <span>{token}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveToken(index)}
                className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer border-none bg-transparent p-0 flex items-center justify-center"
                title={`Xóa "${token}"`}
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => handleAddToken(inputValue)}
            placeholder={tokens.length === 0 ? placeholder : 'Thêm từ...'}
            className="border-none bg-transparent focus:ring-0 p-0 text-sm flex-1 min-w-[140px] text-slate-800 placeholder:text-slate-400 outline-none"
          />
        )}
      </div>

      {/* Gợi ý nhanh: Tự động ẩn các từ đã được chọn */}
      {availablePresets.length > 0 && !disabled && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
          <span className="font-medium text-slate-400">Gợi ý nhanh:</span>
          {availablePresets.slice(0, 6).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleAddToken(preset)}
              className="rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 px-2 py-0.5 font-medium transition-colors cursor-pointer border border-transparent hover:border-blue-200"
            >
              + {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

