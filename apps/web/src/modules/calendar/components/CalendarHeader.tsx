import React from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Bell,
    Volume2,
    CalendarDays,
    ListTodo,
} from 'lucide-react';
import { playChimeSound } from '../../activities/hooks/useActivityReminders.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { useTranslation } from '../../../i18n/index.js';

export type CalendarViewMode = 'MONTH' | 'WEEK' | 'AGENDA';

export interface CalendarHeaderProps {
    monthYearLabel: string;
    viewMode: CalendarViewMode;
    onViewModeChange: (mode: CalendarViewMode) => void;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onRequestBrowserPermission: () => void;
    onCreateNew: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
    monthYearLabel,
    viewMode,
    onViewModeChange,
    onPrev,
    onNext,
    onToday,
    onRequestBrowserPermission,
    onCreateNew,
}) => {
    const { t } = useTranslation();

    const viewOptions: Array<{
        id: CalendarViewMode;
        label: string;
        shortLabel?: string;
        icon: React.ReactNode;
    }> = [
            {
                id: 'MONTH',
                label: t('calendar.viewMonth', 'Tháng'),
                icon: <CalendarIcon size={13} />,
            },
            {
                id: 'WEEK',
                label: t('calendar.viewWeek', 'Tuần'),
                icon: <CalendarDays size={13} />,
            },
            {
                id: 'AGENDA',
                label: t('calendar.viewAgenda', 'Danh sách'),
                shortLabel: 'DS',
                icon: <ListTodo size={13} />,
            },
        ];

    return (
        <header className="bg-slate-50/90 border-b border-slate-200 px-3.5 sm:px-5 py-2.5 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Trái: Điều hướng thời gian + Tiêu đề tháng */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
                <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="w-7 h-7 inline-flex items-center justify-center hover:bg-slate-100 rounded-md text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
                        title="Kỳ trước"
                        aria-label="Kỳ trước"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={onToday}
                        className="px-2.5 h-7 text-xs font-medium hover:bg-slate-100 rounded-md text-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                    >
                        Hôm nay
                    </button>
                    <button
                        type="button"
                        onClick={onNext}
                        className="w-7 h-7 inline-flex items-center justify-center hover:bg-slate-100 rounded-md text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
                        title="Kỳ tiếp theo"
                        aria-label="Kỳ tiếp theo"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>

                <h1 className="text-[15px] sm:text-base font-semibold text-slate-950 tracking-tight m-0 shrink-0">
                    {monthYearLabel}
                </h1>
            </div>

            {/* Phải: Chuyển chế độ xem + Tiện ích thông báo + Nút tạo */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
                <div className="inline-flex items-center bg-slate-200/70 rounded-lg p-0.5 text-xs shrink-0">
                    {viewOptions.map((opt) => {
                        const isActive = viewMode === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => onViewModeChange(opt.id)}
                                className={`h-7 px-2.5 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 ${isActive
                                        ? 'bg-white text-slate-950 font-semibold'
                                        : 'text-slate-600 hover:text-slate-950 font-medium'
                                    }`}
                            >
                                {opt.icon}
                                {opt.shortLabel ? (
                                    <>
                                        <span className="hidden xs:inline">{opt.label}</span>
                                        <span className="xs:hidden">{opt.shortLabel}</span>
                                    </>
                                ) : (
                                    <span>{opt.label}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            playChimeSound();
                            notify.info(
                                'Chuông thông báo nhắc việc đang hoạt động ổn định.',
                                'Âm thanh thông báo'
                            );
                        }}
                        className="w-8 h-8 inline-flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                        title="Thử chuông nhắc nhở"
                        aria-label="Thử chuông nhắc nhở"
                    >
                        <Volume2 size={14} />
                    </button>

                    <button
                        type="button"
                        onClick={onRequestBrowserPermission}
                        className="w-8 h-8 inline-flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
                        title="Bật thông báo trình duyệt"
                        aria-label="Bật thông báo trình duyệt"
                    >
                        <Bell size={14} />
                    </button>

                    <button
                        type="button"
                        onClick={onCreateNew}
                        className="h-8 inline-flex items-center gap-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                        <Plus size={14} />
                        <span className="hidden sm:inline">
                            {t('calendar.addActivityBtn', 'Thêm công việc')}
                        </span>
                        <span className="sm:hidden">Tạo mới</span>
                    </button>
                </div>
            </div>
        </header>
    );
};