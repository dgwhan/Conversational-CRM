import React from 'react';
import { Award, Trophy, Medal, Clock } from 'lucide-react';
import type { StaffPerformanceReport } from '../reports.types.js';
import { useTranslation } from '../../../i18n/index.js';

interface StaffLeaderboardProps {
  staffList: StaffPerformanceReport[];
  entityName?: string;
  valueLabel?: string;
  wonLabel?: string;
}

export const StaffLeaderboard: React.FC<StaffLeaderboardProps> = ({
  staffList,
  entityName,
  valueLabel,
  wonLabel,
}) => {
  const { t, locale } = useTranslation();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-bold text-xs" title={locale === 'en' ? 'Rank 1 Champion' : 'Hạng 1 Tuyệt đối'}>
            <Trophy size={14} />
          </div>
        );
      case 1:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs" title={locale === 'en' ? 'Rank 2 Excellent' : 'Hạng 2 Xuất sắc'}>
            <Medal size={14} />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs" title={locale === 'en' ? 'Rank 3 Potential' : 'Hạng 3 Triển vọng'}>
            <Award size={14} />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-semibold text-xs">
            #{index + 1}
          </div>
        );
    }
  };

  const displayEntity = entityName || (locale === 'en' ? 'Leads' : 'Hồ Sơ');
  const displayWon = wonLabel || t('reports.wonCol', 'Chốt Thành Công');
  const displayValue = valueLabel || t('reports.revenueCol', 'Doanh Thu');

  return (
    <div className="min-w-0 bg-white rounded-xl p-3 sm:p-4 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {t('reports.leaderboardTitle', 'Bảng xếp hạng hiệu suất')}
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[720px] text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-3 text-center w-12">{t('reports.rankCol', 'Hạng')}</th>
              <th className="py-3 px-4">{t('reports.staffCol', 'Tư Vấn Viên / Sales')}</th>
              <th className="py-3 px-3 text-center">{displayEntity} {t('reports.receivedCol', 'Nhận')}</th>
              <th className="py-3 px-3 text-center">{displayWon}</th>
              <th className="py-3 px-4">{t('reports.conversionCol', 'Tỷ Lệ Chuyển Đổi')}</th>
              <th className="py-3 px-4 text-right">{displayValue}</th>
              <th className="py-3 px-3 text-center">{t('reports.speedCol', 'Tốc Độ Chat')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffList.length > 0 ? (
              staffList.map((staff, idx) => {
                const won = staff.wonCount ?? staff.enrolledCount ?? 0;
                return (
                  <tr key={staff.staffId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex justify-center">{getRankBadge(idx)}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs border border-blue-200">
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{staff.name}</div>
                          <div className="text-[11px] text-slate-400">{locale === 'en' ? 'Counselor / Agent' : 'Chuyên viên tư vấn'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-700 font-semibold">
                      {staff.leadsCount}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {won} {displayEntity.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(staff.conversionRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 min-w-9">
                          {staff.conversionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(staff.revenue)}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Clock size={12} className="text-teal-600" />
                        {staff.avgResponseTime}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 text-sm">
                  {t('reports.emptyStaffData', 'Chưa có dữ liệu tư vấn viên')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
