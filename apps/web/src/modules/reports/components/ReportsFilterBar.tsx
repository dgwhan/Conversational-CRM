import React from 'react';
import {
  Calendar,
  Filter,
  Download,
  Printer,
  RotateCw,
} from 'lucide-react';
import type { TimeRangeFilter } from '../reports.types.js';
import { useTranslation } from '../../../i18n/index.js';

interface ReportsFilterBarProps {
  selectedRange: TimeRangeFilter;
  onRangeChange: (range: TimeRangeFilter) => void;
  selectedChannel: string;
  onChannelChange: (channel: string) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  isLoading?: boolean;
  domain?: string;
  workspaceName?: string;
}

export const ReportsFilterBar: React.FC<ReportsFilterBarProps> = ({
  selectedRange,
  onRangeChange,
  selectedChannel,
  onChannelChange,
  onRefresh,
  onExportCsv,
  isLoading = false,
  domain: _domain,
  workspaceName: _workspaceName,
}) => {
  const { t } = useTranslation();

  const timeRanges: { id: TimeRangeFilter; label: string }[] = [
    { id: 'today', label: t('reports.periods.today', 'Hôm nay') },
    { id: 'yesterday', label: t('reports.periods.yesterday', 'Hôm qua') },
    { id: '7days', label: t('reports.periods.days7', '7 Ngày') },
    { id: '30days', label: t('reports.periods.days30', '30 Ngày') },
    { id: 'thisMonth', label: t('reports.periods.thisMonth', 'Tháng này') },
    { id: 'quarter', label: t('reports.periods.quarter', 'Quý này') },
    { id: 'year', label: t('reports.periods.year', 'Năm nay') },
    { id: 'all', label: t('reports.periods.all', 'Toàn bộ') },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 mb-3.5">
      {/* 1. Flat Segmented Control: Chu kỳ thời gian */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 shrink-0 mr-0.5">
          <Calendar size={14} className="text-slate-400" />
          <span>{t('reports.periodLabel', 'Chu kỳ:')}</span>
        </span>
        <div className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-lg border border-slate-200/80 shrink-0">
          {timeRanges.map((r) => {
            const isActive = selectedRange === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onRangeChange(r.id)}
                className={`px-3 py-1 text-xs rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-semibold shadow-2xs border border-blue-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium'
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Cụm bộ lọc kênh & Thao tác đồng bộ */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Dropdown Kênh tiếp nhận */}
        <div className="relative inline-flex items-center">
          <Filter size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <select
            className="h-8 pl-7 pr-8 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 shadow-2xs focus:outline-hidden focus:border-slate-300 cursor-pointer appearance-none"
            value={selectedChannel}
            onChange={(e) => onChannelChange(e.target.value)}
          >
            <option value="ALL">{t('reports.channels.all', 'Tất cả kênh tiếp nhận')}</option>
            <option value="FACEBOOK">{t('reports.channels.facebook', 'Facebook Messenger')}</option>
            <option value="ZALO">{t('reports.channels.zalo', 'Zalo OA / Cá nhân')}</option>
            <option value="TIKTOK">{t('reports.channels.tiktok', 'TikTok Lead Gen')}</option>
            <option value="MANUAL">{t('reports.channels.manual', 'Nhập tay / Hotline')}</option>
            <option value="WEBSITE">{t('reports.channels.website', 'Website / Form')}</option>
          </select>
          <div className="absolute right-2.5 pointer-events-none text-slate-400 text-[11px]">▼</div>
        </div>

        {/* Nút Làm mới */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          title={t('reports.refreshTitle', 'Tải lại dữ liệu mới nhất')}
        >
          <RotateCw size={13} className={isLoading ? 'animate-spin text-blue-600' : 'text-slate-500'} />
          <span>{t('reports.refreshBtn', 'Làm mới')}</span>
        </button>

        {/* Nút Xuất Excel/CSV */}
        <button
          type="button"
          onClick={onExportCsv}
          className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          title={t('reports.exportTitle', 'Xuất bảng số liệu ra file Excel / CSV')}
        >
          <Download size={13} className="text-slate-500" />
          <span>{t('reports.exportBtn', 'Xuất Excel/CSV')}</span>
        </button>

        {/* Nút In */}
        <button
          type="button"
          onClick={handlePrint}
          className="h-8 w-8 inline-flex items-center justify-center text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          title={t('reports.printTitle', 'In hoặc lưu PDF')}
        >
          <Printer size={13} />
        </button>
      </div>
    </div>
  );
};
