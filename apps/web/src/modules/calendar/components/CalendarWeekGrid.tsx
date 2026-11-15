import React from 'react';
import { Plus, CheckCircle2, Circle, User, Clock } from 'lucide-react';
import type { ActivityItem } from '../../../lib/api-client/index.js';
import { useTranslation } from '../../../i18n/index.js';

export interface WeekDayColumn {
    date: Date;
    isToday: boolean;
    items: ActivityItem[];
}

export interface CalendarWeekGridProps {
    weekDays: WeekDayColumn[];
    locale: string;
    onSelectDate: (date: Date) => void;
    onEditActivity: (activity: ActivityItem) => void;
    onToggleTask: (activity: ActivityItem, e?: React.MouseEvent) => void;
}

export const CalendarWeekGrid: React.FC<CalendarWeekGridProps> = ({
    weekDays,
    locale,
    onSelectDate,
    onEditActivity,
    onToggleTask,
}) => {
    const { t } = useTranslation();

    const dayNames =
        locale === 'en'
            ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            : ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

    return (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white min-h-0">
            {weekDays.map((day, idx) => (
                <div
                    key={idx}
                    className={`p-3 flex flex-col min-w-0 ${day.isToday ? 'bg-blue-50/20' : 'bg-white'
                        }`}
                >
                    {/* Header cột ngày */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                        <div>
                            <span className="text-[11px] text-slate-500 font-medium block">
                                {dayNames[idx]}
                            </span>
                            <span
                                className={`text-sm font-semibold tabular-nums ${day.isToday ? 'text-blue-600' : 'text-slate-950'
                                    }`}
                            >
                                {day.date.getDate()} Thg {day.date.getMonth() + 1}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => onSelectDate(day.date)}
                            className="w-6 h-6 inline-flex items-center justify-center hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Thêm sự kiện ngày này"
                        >
                            <Plus size={14} />
                        </button>
                    </div>

                    {/* Danh sách thẻ sự kiện phẳng */}
                    <div className="flex-1 space-y-2 overflow-y-auto">
                        {day.items.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs">
                                {t('calendar.noActivitiesYet', 'Không có lịch')}
                            </div>
                        ) : (
                            day.items.map((item) => {
                                const isCompleted = item.status === 'COMPLETED';
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => onEditActivity(item)}
                                        className={`p-2.5 rounded-lg border transition-colors cursor-pointer text-xs space-y-1.5 ${isCompleted
                                                ? 'bg-slate-50/80 border-slate-200/70 opacity-65'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-1.5">
                                            <span
                                                className={`font-medium leading-snug ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                                                    }`}
                                            >
                                                {item.title}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => onToggleTask(item, e)}
                                                className="text-slate-400 hover:text-emerald-600 shrink-0 cursor-pointer"
                                            >
                                                {isCompleted ? (
                                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                                ) : (
                                                    <Circle size={14} />
                                                )}
                                            </button>
                                        </div>

                                        {item.customer && (
                                            <div className="text-[11px] text-blue-700 flex items-center gap-1 truncate">
                                                <User size={10} className="shrink-0" />
                                                <span className="truncate">{item.customer.fullName}</span>
                                            </div>
                                        )}

                                        <div className="text-[10px] text-slate-400 flex items-center gap-1 tabular-nums">
                                            <Clock size={10} />
                                            <span>
                                                {item.scheduledAt
                                                    ? new Date(item.scheduledAt).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })
                                                    : 'Cả ngày'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};