import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  count?: number;
  dotColor?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allOptionLabel?: string;
  clearable?: boolean;
  searchable?: boolean;
  maxRenderItems?: number;
  size?: 'sm' | 'md';
  disabled?: boolean;
  label?: ReactNode;
  error?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
}

export function normalizeVietnamese(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Ultra-minimal, text-only SearchableSelect Combobox
 * - Inline editable input trigger (type directly to search 10,000+ options)
 * - Strict text-only: Zero count badges or numbers in trigger & option rows
 * - Top 40 matches performance cap with accent-insensitive Vietnamese search
 * - Single-line h-7 rounded rows with zero border dividers
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Chọn...',
  allOptionLabel,
  clearable = false,
  searchable = true,
  maxRenderItems = 40,
  size = 'md',
  disabled = false,
  label,
  error,
  fullWidth = false,
  className = '',
  triggerClassName = '',
  dropdownClassName = '',
  id,
  name,
  'aria-label': ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    openAbove: boolean;
  }>({
    top: 0,
    left: 0,
    width: 200,
    openAbove: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Prepend allOptionLabel if supplied and not already in options
  const effectiveOptions = useMemo<SearchableSelectOption[]>(() => {
    if (!allOptionLabel) return options;
    const hasAll = options.some((opt) => opt.value === '' || opt.value === 'ALL');
    if (hasAll) return options;
    return [{ value: '', label: allOptionLabel }, ...options];
  }, [options, allOptionLabel]);

  // Selected option
  const selectedOption = useMemo(() => {
    return effectiveOptions.find((opt) => opt.value === value);
  }, [effectiveOptions, value]);

  // Filter options with accent-insensitive Vietnamese matching
  const filteredOptions = useMemo(() => {
    if (!isTyping || !searchQuery.trim()) return effectiveOptions;
    const normalizedQuery = normalizeVietnamese(searchQuery);
    return effectiveOptions.filter((opt) => {
      const normalizedLabel = normalizeVietnamese(opt.label);
      return normalizedLabel.includes(normalizedQuery);
    });
  }, [effectiveOptions, isTyping, searchQuery]);

  // Slice for 10,000+ performance cap (default 40 items)
  const renderedOptions = useMemo(() => {
    return filteredOptions.slice(0, maxRenderItems);
  }, [filteredOptions, maxRenderItems]);

  // Update popover coordinates
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 200);
    const estimatedHeight = Math.min(280, (renderedOptions.length || 1) * 34 + 20);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = spaceBelow < 200 && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + minWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - minWidth - 12);
    }

    const top = openAbove
      ? Math.max(12, rect.top - estimatedHeight - 4)
      : rect.bottom + 4;

    setCoords({
      top,
      left,
      width: minWidth,
      openAbove,
    });
  }, [renderedOptions.length]);

  // Toggle open / close
  const openDropdown = useCallback(() => {
    if (disabled) return;
    updatePosition();
    setIsOpen(true);
    setHighlightedIndex(0);
  }, [disabled, updatePosition]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setIsTyping(false);
    setSearchQuery('');
  }, []);

  // Handle outside click & scroll
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      closeDropdown();
    };

    const handleScroll = (e: Event) => {
      const target = e.target as Node;
      // Do not close when scrolling inside the dropdown itself
      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        return;
      }
      closeDropdown();
    };

    const handleResize = () => {
      closeDropdown();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, closeDropdown]);

  // Ensure highlighted index is within bounds when list changes
  useEffect(() => {
    setHighlightedIndex((prev) => {
      if (prev >= renderedOptions.length) {
        return Math.max(0, renderedOptions.length - 1);
      }
      return prev;
    });
  }, [renderedOptions.length]);

  // Scroll active option into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
    if (activeElement && typeof activeElement.scrollIntoView === 'function') {
      activeElement.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  // Select an option
  const handleSelect = useCallback(
    (opt: SearchableSelectOption) => {
      if (opt.disabled) return;
      onChange?.(opt.value);
      closeDropdown();
      inputRef.current?.blur();
    },
    [onChange, closeDropdown]
  );

  // Clear value
  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
      setIsTyping(false);
      setSearchQuery('');
    },
    [onChange]
  );

  // Input typing handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIsTyping(true);
    setSearchQuery(val);
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    }
    setHighlightedIndex(0);
  };

  const handleInputFocus = () => {
    if (disabled) return;
    openDropdown();
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    if (!isOpen) {
      openDropdown();
      if (searchable) {
        inputRef.current?.focus();
      } else {
        triggerRef.current?.focus();
      }
    } else {
      closeDropdown();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openDropdown();
        if (searchable) {
          inputRef.current?.focus();
        }
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
    } else if (e.key === 'Tab') {
      closeDropdown();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev + 1;
        while (next < renderedOptions.length && renderedOptions[next]?.disabled) {
          next++;
        }
        return next < renderedOptions.length ? next : prev;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && renderedOptions[next]?.disabled) {
          next--;
        }
        return next >= 0 ? next : prev;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = renderedOptions[highlightedIndex];
      if (current && !current.disabled) {
        handleSelect(current);
      }
    }
  };

  const displayInputValue = isTyping
    ? searchQuery
    : selectedOption
    ? selectedOption.label
    : '';

  return (
    <div
      ref={containerRef}
      className={`searchable-select inline-flex flex-col ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-slate-700 mb-1 select-none flex items-center justify-between"
        >
          {label}
        </label>
      )}

      {/* Hidden input for form submission if name is provided */}
      {name && <input type="hidden" name={name} value={value} id={id} />}

      {/* Single, Seamless Flat Trigger Container */}
      <div
        ref={triggerRef}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex items-center justify-between gap-2.5 ${
          size === 'sm' ? 'h-7.5 px-3 text-xs' : 'h-9 px-3.5 text-[13px]'
        } ${fullWidth ? 'w-full' : ''} bg-white border border-slate-300 rounded-md hover:border-slate-400 text-slate-800 shadow-2xs transition-colors ${
          isOpen
            ? 'border-blue-600 ring-2 ring-blue-100'
            : 'focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100'
        } ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer'
        } ${error ? '!border-red-500 !ring-red-100' : ''} ${triggerClassName}`}
      >
        <input
          ref={inputRef}
          type="text"
          id={id}
          disabled={disabled}
          readOnly={!searchable}
          tabIndex={searchable ? 0 : -1}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          placeholder={placeholder}
          value={displayInputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className={`searchable-select-input w-full min-w-0 flex-1 bg-transparent border-0 p-0 m-0 text-[13px] font-normal text-slate-800 placeholder:text-slate-400 outline-none ring-0 focus:outline-none focus:ring-0 focus:border-0 shadow-none appearance-none ${
            searchable ? 'cursor-text select-text' : 'cursor-pointer select-none pointer-events-none'
          }`}
          style={{
            background: 'transparent',
            backgroundColor: 'transparent',
            border: 'none',
            borderWidth: 0,
            boxShadow: 'none',
            padding: 0,
            margin: 0,
            outline: 'none',
          }}
        />

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-200/80 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Xóa lựa chọn"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 text-slate-400 shrink-0 pointer-events-none ${
              isOpen ? 'rotate-180 text-blue-600' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown Options List Popover */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            tabIndex={-1}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              minWidth: `${coords.width}px`,
              maxWidth: 'calc(100vw - 24px)',
              width: 'max-content',
              zIndex: 9999,
            }}
            className={`fixed bg-white rounded-lg border border-slate-200/90 shadow-md p-1.5 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}
          >
            <ul
              ref={listRef}
              className="max-h-60 overflow-y-auto py-0.5 divide-y-0 text-left list-none m-0 p-0 space-y-0.5"
            >
              {renderedOptions.length === 0 ? (
                <li className="px-3 py-3 text-center text-xs text-slate-400 font-medium">
                  Không tìm thấy kết quả phù hợp
                </li>
              ) : (
                renderedOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(opt);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`min-h-[34px] px-3 py-1.5 rounded-md flex items-center justify-between text-[13px] cursor-pointer select-none transition-colors ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed bg-transparent'
                          : isSelected
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : isHighlighted
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-800 hover:bg-slate-100/80'
                      }`}
                    >
                      <span className="truncate flex-1 mr-2.5 leading-normal">{opt.label}</span>
                      {isSelected && (
                        <Check size={14} className="text-blue-600 shrink-0 ml-1" />
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body
        )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};
