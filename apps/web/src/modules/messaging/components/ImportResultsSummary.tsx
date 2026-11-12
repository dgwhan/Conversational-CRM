import React from 'react';
import { Layers, CheckCircle2, XCircle } from 'lucide-react';
import { StatCard } from '../../../components/ui/StatCard.js';
import type { ImportMessagesResponse } from '../types/messaging.types.js';

import { useTranslation } from '../../../i18n/index.js';
interface ImportResultsSummaryProps {
  result: ImportMessagesResponse;
}

export const ImportResultsSummary: React.FC<ImportResultsSummaryProps> = ({ result }) => {
  const { t } = useTranslation();
  return (
    <div className="crm-results-summary">
      <StatCard
        variant="neutral"
        label={t('messagingImport.summary.total', 'Tổng số dòng xử lý')}
        value={result.total}
        icon={<Layers size={22} />}
        description={t('messagingImport.summary.totalDesc', 'Tổng số dòng được đưa vào kiểm thực Zod')}
      />
      <StatCard
        variant="success"
        label={t('messagingImport.summary.valid', 'Hợp lệ & Đã import')}
        value={result.successCount}
        icon={<CheckCircle2 size={22} />}
        description={t('messagingImport.summary.validDesc', 'Đã lưu vào Database & enqueue vào BullMQ')}
      />
      <StatCard
        variant="danger"
        label={t('messagingImport.summary.invalid', 'Dòng lỗi vi phạm')}
        value={result.errorCount}
        icon={<XCircle size={22} />}
        description={t('messagingImport.summary.invalidDesc', 'Bị bác bỏ do không thỏa mãn Zod Schema')}
      />
    </div>
  );
};
