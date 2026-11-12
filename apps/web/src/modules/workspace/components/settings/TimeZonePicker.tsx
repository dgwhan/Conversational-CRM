import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const COMMON_TIME_ZONES = [
  'Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Jakarta',
  'Asia/Kuala_Lumpur', 'Asia/Manila', 'Asia/Phnom_Penh', 'Asia/Vientiane',
  'Asia/Tokyo', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Kolkata', 'Asia/Dubai',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York',
  'America/Los_Angeles', 'Australia/Sydney', 'UTC',
];

type IntlWithTimeZoneList = typeof Intl & {
  supportedValuesOf?: (key: 'timeZone') => string[];
};

const TIME_ZONE_IDS = (() => {
  const intl = Intl as IntlWithTimeZoneList;
  const supported = intl.supportedValuesOf?.('timeZone') ?? COMMON_TIME_ZONES;
  return [...new Set(['UTC', ...COMMON_TIME_ZONES, ...supported])].sort((a, b) => a.localeCompare(b));
})();

function getTimeZoneDetails(timeZone: string) {
  const city = timeZone === 'UTC'
    ? 'Coordinated Universal Time'
    : (timeZone.split('/').at(-1) || timeZone).replaceAll('_', ' ');
  const region = timeZone.includes('/') ? timeZone.split('/').slice(0, -1).join(' / ').replaceAll('_', ' ') : 'UTC';
  try {
    const offset = new Intl.DateTimeFormat('en', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value;
    return { city, region, offset: offset || 'UTC' };
  } catch {
    return { city: timeZone, region: '', offset: 'UTC' };
  }
}

const TIME_ZONE_OPTIONS = TIME_ZONE_IDS.map((id) => ({ id, ...getTimeZoneDetails(id) }));

export interface TimeZonePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const TimeZonePicker: React.FC<TimeZonePickerProps> = ({ value, onChange, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const selected = TIME_ZONE_OPTIONS.find((option) => option.id === value) ?? {
    id: value,
    ...getTimeZoneDetails(value),
  };

  const options = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return TIME_ZONE_OPTIONS.filter((option) => COMMON_TIME_ZONES.includes(option.id));
    return TIME_ZONE_OPTIONS.filter((option) =>
      `${option.id} ${option.city} ${option.region} ${option.offset}`.toLocaleLowerCase().includes(query),
    ).slice(0, 100);
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();
    setActiveIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    document.getElementById(`timezone-option-${activeIndex}`)?.scrollIntoView({
      block: 'nearest',
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    });
  }, [activeIndex, isOpen, options, shouldReduceMotion]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(options.length - 1, 0)));
  }, [options.length]);

  const selectTimeZone = (timeZone: string) => {
    onChange(timeZone);
    setSearch('');
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && options[activeIndex]) {
      event.preventDefault();
      selectTimeZone(options[activeIndex].id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setSearch('');
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.16, ease: 'easeOut' as const };

  return (
    <div ref={rootRef} className={`relative mt-1 ${isOpen ? 'z-[60]' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Múi giờ workspace: ${selected.id}`}
        onClick={() => {
          if (isOpen) { setSearch(''); setIsOpen(false); }
          else setIsOpen(true);
        }}
        className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 text-left transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          isOpen ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-300 hover:border-slate-400'
        } ${disabled ? 'cursor-not-allowed bg-slate-50 opacity-70' : 'cursor-pointer'}`}
      >
        <span className="flex min-w-0 items-center">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-800">{selected.city}</span>
            <span className="block truncate text-[11px] font-normal text-slate-500">{selected.offset} · {selected.id}</span>
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium text-blue-700">
          {isOpen ? 'Đóng' : 'Đổi'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: -5, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.99 }}
            transition={transition}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
          >
            <div className="border-b border-slate-100 p-2.5">
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setActiveIndex(0); }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Tìm thành phố, khu vực hoặc UTC…"
                  aria-label="Tìm múi giờ"
                  aria-controls="workspace-time-zone-options"
                  aria-activedescendant={options[activeIndex] ? `timezone-option-${activeIndex}` : undefined}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded="true"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 pr-12 text-sm text-slate-800 outline-none transition-[border-color,background-color,box-shadow] placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Xóa nội dung tìm kiếm"
                    onClick={() => { setSearch(''); setActiveIndex(0); searchRef.current?.focus(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <span>{search.trim() ? 'Kết quả tìm kiếm' : 'Múi giờ phổ biến'}</span>
                <span>{options.length}{search.trim() ? ' kết quả' : ''}</span>
              </div>
            </div>

            <div id="workspace-time-zone-options" role="listbox" aria-label="Danh sách múi giờ" className="max-h-64 overflow-y-auto overscroll-contain p-1.5">
              {options.length ? options.map((option, index) => {
                const isSelected = option.id === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    id={`timezone-option-${index}`}
                    key={option.id}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectTimeZone(option.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors duration-100 ${
                      isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex min-w-0 items-center">
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-slate-800">{option.city}</span>
                        <span className="block truncate text-[10px] text-slate-500">{option.region ? `${option.region} · ` : ''}{option.id}</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-1 text-[10px] font-medium text-slate-600">{option.offset}</span>
                      {isSelected && <span className="text-[10px] font-medium text-blue-700">Đang chọn</span>}
                    </span>
                  </button>
                );
              }) : <div className="px-3 py-8 text-center text-xs text-slate-500">Không tìm thấy múi giờ phù hợp.</div>}
            </div>
            <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2 text-[10px] text-slate-500">
              Mã IANA được lưu để tự tính giờ mùa hè khi khu vực có áp dụng.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <span className="mt-1.5 block text-[11px] font-normal text-slate-500">Áp dụng cho lịch ca và tự cập nhật theo quy tắc múi giờ.</span>
    </div>
  );
};
