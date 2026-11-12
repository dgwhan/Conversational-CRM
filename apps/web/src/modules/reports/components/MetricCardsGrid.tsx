import React from 'react';
import {
  Users,
  GraduationCap,
  TrendingUp,
  DollarSign,
  Clock,
  UserX,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Sparkles,
  ShoppingBag,
  CheckCircle2,
} from 'lucide-react';
import type { OverviewMetrics } from '../reports.types.js';
import { useTranslation } from '../../../i18n/index.js';

interface MetricCardsGridProps {
  metrics: OverviewMetrics;
  terminology?: {
    entityName: string;
    pipelineName: string;
    productLabel: string;
    valueLabel: string;
  };
  domain?: string;
}

export const MetricCardsGrid: React.FC<MetricCardsGridProps> = ({
  metrics,
  terminology,
  domain,
}) => {
  const { t, locale } = useTranslation();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatResponseTime = (mins: number) => {
    if (!mins || mins <= 0) return locale === 'en' ? 'N/A' : 'Chưa có';
    if (mins >= 60) return `${(mins / 60).toFixed(1)} ${locale === 'en' ? 'hours' : 'giờ'}`;
    return `${Math.round(mins)} ${locale === 'en' ? 'mins' : 'phút'}`;
  };

  const getWonConfig = () => {
    switch (domain) {
      case 'REAL_ESTATE':
        return {
          title: locale === 'en' ? 'Closed Deposits' : 'Chốt cọc thành công',
          icon: <Building2 size={16} className="text-emerald-600" />,
        };
      case 'BEAUTY_SPA':
        return {
          title: locale === 'en' ? 'Closed Packages' : 'Chốt liệu trình',
          icon: <Sparkles size={16} className="text-emerald-600" />,
        };
      case 'RETAIL':
        return {
          title: locale === 'en' ? 'Completed Orders' : 'Đơn hàng thành công',
          icon: <ShoppingBag size={16} className="text-emerald-600" />,
        };
      case 'B2B_SAAS':
        return {
          title: locale === 'en' ? 'Signed Contracts' : 'Hợp đồng ký kết',
          icon: <CheckCircle2 size={16} className="text-emerald-600" />,
        };
      case 'EDUCATION':
      default:
        return {
          title: locale === 'en' ? 'Enrolled Students' : 'Nhập học thành công',
          icon: <GraduationCap size={16} className="text-emerald-600" />,
        };
    }
  };

  const wonConfig = getWonConfig();
  const wonCount = metrics.wonCount ?? metrics.enrolledCount ?? 0;
  const collectedValue = metrics.totalCollectedValue ?? metrics.totalCollectedTuition ?? 0;
  const estimatedValue = metrics.totalEstimatedValue ?? metrics.totalEstimatedTuition ?? 0;

  const rawEntityLabel = terminology?.entityName || 'Khách hàng';
  const cleanEntityLabel = rawEntityLabel.split('/')[0].trim();
  const rawValueLabel = terminology?.valueLabel || 'Giá trị dự kiến';
  const cleanValueLabel = rawValueLabel.replace(/\s*\(VNĐ\)/gi, '').trim();

  const cards = [
    {
      title: `${t('reports.metrics.totalPrefix', 'Tổng')} ${cleanEntityLabel}`,
      fullTitle: `${t('reports.metrics.totalPrefix', 'Tổng')} ${rawEntityLabel}`,
      value: metrics.totalLeads.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN'),
      subtext: `${metrics.newLeadsGrowth >= 0 ? '+' : ''}${metrics.newLeadsGrowth}% ${t('reports.metrics.comparedToPrevious', 'so với kỳ trước')}`,
      isPositive: metrics.newLeadsGrowth >= 0,
      icon: <Users size={16} className="text-blue-600" />,
    },
    {
      title: wonConfig.title,
      fullTitle: wonConfig.title,
      value: wonCount.toLocaleString(locale === 'en' ? 'en-US' : 'vi-VN'),
      subtext: `${t('reports.metrics.conversionRatePrefix', 'Tỷ lệ chuyển đổi:')} ${metrics.conversionRate}%`,
      isPositive: true,
      icon: wonConfig.icon,
    },
    {
      title: t('reports.metrics.actualRevenue', 'Doanh thu thực thu'),
      fullTitle: t('reports.metrics.actualRevenueFull', 'Doanh thu thực thu (Đã thanh toán)'),
      value: formatCurrency(collectedValue),
      subtext: t('reports.metrics.actualRevenueSub', 'Đã hoàn tất thanh toán / ghi nhận'),
      isPositive: true,
      icon: <DollarSign size={16} className="text-amber-600" />,
    },
    {
      title: `${t('reports.metrics.pipelineValuePrefix', 'Phễu')} ${cleanValueLabel}`,
      fullTitle: `${t('reports.metrics.pipelineValuePrefix', 'Phễu')} ${rawValueLabel}`,
      value: formatCurrency(estimatedValue),
      subtext: t('reports.metrics.pipelineValueSub', 'Quy mô tiềm năng đang chăm sóc'),
      isPositive: true,
      icon: <TrendingUp size={16} className="text-purple-600" />,
    },
    {
      title: t('reports.metrics.responseTime', 'Tốc độ phản hồi'),
      fullTitle: t('reports.metrics.responseTimeFull', 'Tốc độ phản hồi khách hàng đầu tiên'),
      value: formatResponseTime(metrics.avgResponseTimeMinutes),
      subtext: metrics.avgResponseTimeMinutes > 0 ? t('reports.metrics.responseTimeSub', 'Thời gian phản hồi khách đầu tiên') : t('reports.metrics.noResponseYet', 'Chưa ghi nhận tin nhắn phản hồi'),
      isPositive: true,
      icon: <Clock size={16} className="text-teal-600" />,
    },
    {
      title: t('reports.metrics.dropOffRate', 'Tỷ lệ rơi rụng'),
      fullTitle: t('reports.metrics.dropOffRateFull', 'Tỷ lệ rơi rụng / Thất bại'),
      value: `${metrics.dropOffRate}%`,
      subtext: t('reports.metrics.dropOffSub', 'Không phù hợp / Hủy nhu cầu'),
      isPositive: metrics.dropOffRate < 20,
      icon: <UserX size={16} className="text-rose-600" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-3.5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="min-w-0 bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all duration-150 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-1.5 mb-2.5">
            <span
              className="text-xs font-medium text-slate-500 truncate"
              title={card.fullTitle || card.title}
            >
              {card.title}
            </span>
            <div className="w-7 h-7 rounded-lg border border-slate-200/80 bg-slate-50/80 flex items-center justify-center shrink-0">
              {card.icon}
            </div>
          </div>
          <div>
            <div className="text-base sm:text-xl font-bold text-slate-900 tracking-tight mb-1 truncate" title={card.value}>
              {card.value}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500" title={card.subtext}>
              {card.isPositive ? (
                <ArrowUpRight size={13} className="text-emerald-600 shrink-0" />
              ) : (
                <ArrowDownRight size={13} className="text-rose-600 shrink-0" />
              )}
              <span className="truncate">{card.subtext}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
