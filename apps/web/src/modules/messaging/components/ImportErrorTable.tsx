import React from 'react';
import { AlertCircle, FileSpreadsheet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card.js';
import { Badge } from '../../../components/ui/Badge.js';
import type { RowErrorItem } from '../types/messaging.types.js';

import { useTranslation } from '../../../i18n/index.js';
interface ImportErrorTableProps {
  errors: RowErrorItem[];
}

export const ImportErrorTable: React.FC<ImportErrorTableProps> = ({ errors }) => {
  const { t } = useTranslation();
  if (errors.length === 0) return null;

  return (
    <Card className="crm-error-card">
      <CardHeader>
        <div>
          <CardTitle style={{ color: 'var(--color-danger)' }}>
            {t('messagingImport.errors.title', 'Danh Sách Chi Tiết Dòng Lỗi ({n} dòng)', { n: errors.length })}
          </CardTitle>
          <CardDescription>
            {t('messagingImport.errors.desc', 'Kiểm thực bằng Zod báo cáo cụ thể từng dòng vi phạm để người dùng đối chiếu và chỉnh sửa.')}
          </CardDescription>
        </div>
        <Badge variant="danger" icon={<AlertCircle size={14} />}>
          {t('messagingImport.errors.count', '{n} Lỗi Vi Phạm', { n: errors.length })}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="table-container">
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>{t('messagingImport.errors.colRow', 'Số dòng')}</th>
                <th style={{ width: '120px' }}>{t('messagingImport.errors.colLine', 'Dòng file CSV')}</th>
                <th style={{ width: '340px' }}>{t('messagingImport.errors.colReason', 'Lý do lỗi (Zod Validation)')}</th>
                <th>{t('messagingImport.errors.colRaw', 'Dữ liệu gốc gửi lên (Raw Payload)')}</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err, idx) => (
                <tr key={idx} className="crm-error-row">
                  <td>
                    <Badge variant="danger">
                      {t('messagingImport.errors.rowN', 'Dòng {n}', { n: err.row })}
                    </Badge>
                  </td>
                  <td>
                    {err.csvLine ? (
                      <span className="csv-line-pill">
                        <FileSpreadsheet size={13} />
                        Line {err.csvLine}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-subtle)' }}>-</span>
                    )}
                  </td>
                  <td>
                    <div className="crm-error-reason-box">
                      <AlertCircle size={16} className="error-reason-icon" />
                      <span className="error-reason-text">{err.reason}</span>
                    </div>
                  </td>
                  <td>
                    <pre className="crm-raw-payload-box">
                      {JSON.stringify(err.raw, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
