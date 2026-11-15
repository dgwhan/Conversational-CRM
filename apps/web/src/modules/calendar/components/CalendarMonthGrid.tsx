import React from 'react';
import { Calendar as CalendarIcon, Phone, CheckSquare, Plus } from 'lucide-react';
import type { ActivityItem } from '../../../lib/api-client/index.js';

export interface MonthDayCell {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    items: ActivityItem[];
}

export interface CalendarMonthGridProps {
    days: MonthDayCell[];
    locale: string;
    onSelectDate: (date: Date) => void;
    onEditActivity: (activity: ActivityItem) => void;
}

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
    days,
    locale,
    onSelectDate,
    onEditActivity,
}) => {
    const weekHeaders =
        locale === 'en'
            ? [
                { short: 'M', full: 'Mon' },
                { short: 'T', full: 'Tue' },
                { short: 'W', full: 'Wed' },
                { short: 'T', full: 'Thu' },
                { short: 'F', full: 'Fri' },
                { short: 'S', full: 'Sat', tone: 'text-blue-600' },
                { short: 'S', full: 'Sun', tone: 'text-rose-600' },
            ]
            : [
                { short: 'T2', full: 'Thứ 2' },
                { short: 'T3', full: 'Thứ 3' },
                { short: 'T4', full: 'Thứ 4' },
                { short: 'T5', full: 'Thứ 5' },
                { short: 'T6', full: 'Thứ 6' },
                { short: 'T7', full: 'Thứ 7', tone: 'text-blue-600' },
                { short: 'CN', full: 'Chủ Nhật', tone: 'text-rose-600' },
            ];

    const rowCountClass = days.length > 35 ? 'grid-rows-6' : 'grid-rows-5';

    return (
        <div className="flex-1 flex flex-col bg-white h-full min-h-0 overflow-hidden">
            {/* Tiêu đề 7 thứ trong tuần */}
            <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-center py-2 text-[11px] sm:text-xs font-semibold text-slate-600 shrink-0">
                {weekHeaders.map((col, i) => (
                    <span key={i} className={col.tone || ''}>
                        <span className="sm:hidden">{col.short}</span>
                        <span className="hidden sm:inline">{col.full}</span>
                    </span>
                ))}
            </div>

            {/* Lưới ô ngày tự chia đều chiều cao khung nhìn, không tràn cuộn */}
            <div
                className={`flex-1 grid grid-cols-7 ${rowCountClass} divide-x divide-y divide-slate-200/80 min-h-0 overflow-hidden`}
            >
                {days.map((day, idx) => (
                    <div
                        key={idx}
                        onClick={() => onSelectDate(day.date)}
                        className={`min-h-0 p-1.5 sm:px-2.5 sm:py-1.5 flex flex-col transition-colors group cursor-pointer overflow-hidden ${!day.isCurrentMonth
                                ? 'bg-slate-50/60 text-slate-300'
                                : day.isToday
                                    ? 'bg-blue-50/35'
                                    : 'bg-white hover:bg-slate-50/80'
                            }`}
                    >
                        {/* Header ngày */}
                        <div className="flex items-center justify-between mb-1 shrink-0">
                            <span
                                className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center tabular-nums shrink-0 ${day.isToday
                                        ? 'bg-blue-600 text-white'
                                        : day.isCurrentMonth
                                            ? 'text-slate-800'
                                            : 'text-slate-300'
                                    }`}
                            >
                                {day.date.getDate()}
                            </span>

                            <div className="flex items-center gap-1">
                                {day.items.length > 0 && (
                                    <span className="hidden sm:inline text-[10px] font-medium text-slate-400 tabular-nums">
                                        {day.items.length} việc
                                    </span>
                                )}
                                <span className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 w-5 h-5 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-opacity">
                                    <Plus size={12} />
                                </span>
                            </div>
                        </div>

                        {/* Mobile (<640px): Chấm màu gọn gàng */}
                        <div className="flex sm:hidden items-center justify-center gap-1 mt-0.5 flex-wrap">
                            {day.items.slice(0, 3).map((item) => {
                                const dotColor =
                                    item.status === 'COMPLETED'
                                        ? 'bg-slate-300'
                                        : item.type === 'CALL'
                                            ? 'bg-amber-500'
                                            : item.type === 'MEETING'
                                                ? 'bg-blue-600'
                                                : 'bg-emerald-500';
                                return (
                                    <span
                                        key={item.id}
                                        className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                                        title={item.title}
                                    />
                                );
                            })}
                            {day.items.length > 3 && (
                                <span className="text-[9px] text-blue-600 font-semibold leading-none tabular-nums">
                                    +{day.items.length - 3}
                                </span>
                            )}
                        </div>

                        {/* Desktop (>=640px): Chip sự kiện Soft-Filled phẳng */}
                        <div className="hidden sm:flex flex-1 flex-col gap-1 min-h-0 overflow-hidden">
                            {day.items.slice(0, 2).map((item) => {
                                const isCall = item.type === 'CALL';
                                const isMeeting = item.type === 'MEETING';
                                const isCompleted = item.status === 'COMPLETED';

                                return (
                                    <div
                                        key={item.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditActivity(item);
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[11px] truncate flex items-center gap-1 font-medium transition-colors cursor-pointer shrink-0 ${isCompleted
                                                ? 'bg-slate-100 text-slate-400 line-through'
                                                : isCall
                                                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100/80'
                                                    : isMeeting
                                                        ? 'bg-blue-50 text-blue-800 hover:bg-blue-100/80'
                                                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80'
                                            }`}
                                        title={`${item.title}${item.customer ? ` - ${item.customer.fullName}` : ''}`}
                                    >
                                        {isCall && <Phone size={10} className="shrink-0 text-amber-600" />}
                                        {isMeeting && <CalendarIcon size={10} className="shrink-0 text-blue-600" />}
                                        {!isCall && !isMeeting && (
                                            <CheckSquare size={10} className="shrink-0 text-emerald-600" />
                                        )}
                                        <span className="truncate">{item.title}</span>
                                    </div>
                                );
                            })}

                            {day.items.length > 2 && (
                                <div className="text-[10px] text-blue-600 font-medium px-1 tabular-nums shrink-0">
                                    +{day.items.length - 2} việc khác
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};