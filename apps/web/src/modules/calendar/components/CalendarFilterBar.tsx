import React from 'react';
import { Filter, Search } from 'lucide-react';
import type { ActivityType, ActivityStatus } from '../../../lib/api-client/index.js';
import { useTranslation } from '../../../i18n/index.js';

export interface CalendarFilterBarProps {
    typeFilter: 'ALL' | ActivityType;
    onTypeFilterChange: (type: 'ALL' | ActivityType) => void;
    statusFilter: 'ALL' | ActivityStatus;
    onStatusFilterChange: (status: 'ALL' | ActivityStatus) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
}

export const CalendarFilterBar: React.FC<CalendarFilterBarProps> = ({
    typeFilter,
    onTypeFilterChange,
    statusFilter,
    onStatusFilterChange,
    searchQuery,
    onSearchChange,
}) => {
    const { t } = useTranslation();

    const typeOptions: Array<{ id: 'ALL' | ActivityType; label: string }> = [
        { id: 'ALL', label: t('calendar.typeAll', 'Tất cả loại') },
        { id: 'CALL', label: t('calendar.typeCall', 'Cuộc gọi tư vấn') },
        { id: 'MEETING', label: t('calendar.typeAppointment', 'Lịch hẹn') },
        { id: 'TASK', label: t('calendar.typeTask', 'Nhiệm vụ') },
    ];

    const statusOptions: Array<{ id: 'ALL' | ActivityStatus; label: string }> = [
        { id: 'ALL', label: t('calendar.statusAll', 'Tất cả trạng thái') },
        { id: 'PENDING', label: t('calendar.statusPending', 'Chờ xử lý') },
        { id: 'COMPLETED', label: t('calendar.statusCompleted', 'Đã hoàn thành') },
    ];

    return (
        <div className="bg-white border-b border-slate-200 px-3.5 sm:px-5 py-2 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
            {/* Nhóm lọc mềm dạng Soft-Filled Pills (Không đóng hộp viền) */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                <span className="text-slate-400 font-medium mr-1 inline-flex items-center gap-1 shrink-0">
                    <Filter size={12} />
                    <span>Lọc:</span>
                </span>

                {typeOptions.map((item) => {
                    const isActive = typeFilter === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onTypeFilterChange(item.id)}
                            className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap ${isActive
                                    ? 'bg-blue-50 text-blue-700 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 font-medium'
                                }`}
                        >
                            {item.label}
                        </button>
                    );
                })}

                <span className="h-3.5 w-[1px] bg-slate-200 mx-1.5 shrink-0" />

                {statusOptions.map((item) => {
                    const isActive = statusFilter === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onStatusFilterChange(item.id)}
                            className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap ${isActive
                                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 font-medium'
                                }`}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Ô tìm kiếm mềm */}
            <div className="relative w-full md:w-64 shrink-0">
                <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                    type="text"
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-100/80 border border-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                    placeholder={t('calendar.searchPlaceholder', 'Tìm kiếm công việc, cuộc hẹn...')}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
        </div>
    );
};