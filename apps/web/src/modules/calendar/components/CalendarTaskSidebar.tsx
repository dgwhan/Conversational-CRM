import React from 'react';
import {
    CheckSquare,
    CheckCircle2,
    Circle,
    AlertTriangle,
    ArrowRight,
} from 'lucide-react';
import type { ActivityItem } from '../../../lib/api-client/index.js';

export interface CalendarTaskSidebarProps {
    todayTasks: ActivityItem[];
    overdueTasks: ActivityItem[];
    onEditActivity: (activity: ActivityItem) => void;
    onToggleTask: (activity: ActivityItem, e?: React.MouseEvent) => void;
    onNavigateToKanban?: () => void;
}

export const CalendarTaskSidebar: React.FC<CalendarTaskSidebarProps> = ({
    todayTasks,
    overdueTasks,
    onEditActivity,
    onToggleTask,
    onNavigateToKanban,
}) => {
    return (
        <aside className="w-[310px] min-w-[310px] max-w-[310px] border-l border-slate-200 bg-white hidden xl:flex flex-col h-full shrink-0">
            {/* Header Panel */}
            <div className="h-11 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                <h2 className="m-0 text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare size={14} className="text-emerald-600" />
                    <span>Nhiệm vụ hôm nay</span>
                    <span className="text-slate-400 font-medium tabular-nums">
                        ({todayTasks.length})
                    </span>
                </h2>

                {onNavigateToKanban && (
                    <button
                        type="button"
                        onClick={onNavigateToKanban}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                        <span>Phễu tuyển sinh</span>
                        <ArrowRight size={12} />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Khối nhiệm vụ quá hạn (Flat soft-filled rose) */}
                {overdueTasks.length > 0 && (
                    <div className="p-3.5 bg-rose-50/70 border-b border-rose-200/70 space-y-2">
                        <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-xs">
                            <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                            <span>Quá hạn cần xử lý ({overdueTasks.length})</span>
                        </div>

                        <div className="space-y-1.5">
                            {overdueTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => onEditActivity(task)}
                                    className="p-2.5 bg-white rounded-lg border border-rose-200/80 hover:border-rose-300 text-xs space-y-1 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-1.5">
                                        <span className="font-medium text-rose-950 leading-snug">
                                            {task.title}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => onToggleTask(task, e)}
                                            className="text-slate-400 hover:text-emerald-600 shrink-0 cursor-pointer"
                                        >
                                            <Circle size={14} />
                                        </button>
                                    </div>
                                    <span className="text-[11px] text-rose-600 font-medium block tabular-nums">
                                        Hạn:{' '}
                                        {task.dueAt
                                            ? new Date(task.dueAt).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })
                                            : 'Quá hạn'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Danh sách nhiệm vụ hôm nay (Flat hairline rows) */}
                {todayTasks.length === 0 ? (
                    <div className="py-14 px-4 text-center text-slate-400 text-xs">
                        Không có công việc nào đến hạn hôm nay.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 border-b border-slate-100">
                        {todayTasks.map((task) => {
                            const isCompleted = task.status === 'COMPLETED';
                            return (
                                <div
                                    key={task.id}
                                    onClick={() => onEditActivity(task)}
                                    className={`px-4 py-3 hover:bg-slate-50/80 transition-colors text-xs cursor-pointer ${isCompleted ? 'opacity-60' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span
                                            className={`font-medium leading-snug ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                                                }`}
                                        >
                                            {task.title}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => onToggleTask(task, e)}
                                            className="text-slate-400 hover:text-emerald-600 shrink-0 cursor-pointer"
                                        >
                                            {isCompleted ? (
                                                <CheckCircle2 size={14} className="text-emerald-600" />
                                            ) : (
                                                <Circle size={14} />
                                            )}
                                        </button>
                                    </div>

                                    {task.customer && (
                                        <div className="text-[11px] text-blue-700 mt-1 truncate">
                                            Ứng viên: {task.customer.fullName}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-500">
                                        <span className="tabular-nums">
                                            {task.scheduledAt
                                                ? new Date(task.scheduledAt).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })
                                                : 'Cả ngày'}
                                        </span>
                                        <span>
                                            {task.type === 'CALL'
                                                ? 'Cuộc gọi'
                                                : task.type === 'MEETING'
                                                    ? 'Lịch hẹn'
                                                    : 'Nhiệm vụ'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
};