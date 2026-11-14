import React from 'react';
import { Download, History, RotateCcw, Users } from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import type { CustomerImportJob } from '../../../lib/api-client/customer-import.js';

interface ImportHistoryProps {
  jobs: CustomerImportJob[];
  loading: boolean;
  undoingId: string | null;
  onUndo: (job: CustomerImportJob) => void;
  onViewCustomers: (job: CustomerImportJob) => void;
  onDownloadIssues: (job: CustomerImportJob) => void;
}

const STRATEGY_LABEL: Record<CustomerImportJob['duplicateStrategy'], string> = {
  SKIP: 'Bỏ qua trùng',
  FILL_EMPTY: 'Điền trường trống',
  OVERWRITE: 'Ghi đè',
};

export const ImportHistory: React.FC<ImportHistoryProps> = ({
  jobs,
  loading,
  undoingId,
  onUndo,
  onViewCustomers,
  onDownloadIssues,
}) => (
  <section className="rounded-xl border border-slate-200 bg-white">
    <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
      <History size={16} className="text-slate-500" />
      <h2 className="m-0 text-sm font-bold text-slate-800">Lịch sử nhập</h2>
    </header>

    {loading ? (
      <p className="m-0 px-4 py-6 text-center text-xs text-slate-500">Đang tải…</p>
    ) : jobs.length === 0 ? (
      <p className="m-0 px-4 py-6 text-center text-xs text-slate-500">Chưa có lần nhập nào.</p>
    ) : (
      <ul className="m-0 list-none divide-y divide-slate-100 p-0">
        {jobs.map((job) => (
          <li key={job.id} className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-semibold text-slate-800" title={job.fileName}>
                  {job.fileName}
                </p>
                <p className="m-0 mt-0.5 text-[11px] text-slate-500">
                  {new Date(job.createdAt).toLocaleString('vi-VN')}
                  {job.createdByName ? ` · ${job.createdByName}` : ''}
                  {` · ${STRATEGY_LABEL[job.duplicateStrategy]}`}
                </p>
              </div>
              {job.status === 'UNDONE' && (
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Đã hoàn tác
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">+{job.createdCount} mới</span>
              {job.updatedCount > 0 && (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">{job.updatedCount} cập nhật</span>
              )}
              {job.skippedCount > 0 && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{job.skippedCount} bỏ qua</span>
              )}
              {job.errorCount > 0 && (
                <span className="rounded bg-red-50 px-1.5 py-0.5 font-semibold text-red-700">{job.errorCount} lỗi</span>
              )}
              {job.status === 'UNDONE' && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">đã xóa {job.undoneCount}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {job.status === 'COMPLETED' && job.createdCount > 0 && (
                <Button size="sm" variant="ghost" icon={<Users size={13} />} onClick={() => onViewCustomers(job)}>
                  Xem khách
                </Button>
              )}
              {job.errorCount + job.skippedCount > 0 && (
                <Button size="sm" variant="ghost" icon={<Download size={13} />} onClick={() => onDownloadIssues(job)}>
                  File lỗi
                </Button>
              )}
              {job.canUndo && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RotateCcw size={13} />}
                  loading={undoingId === job.id}
                  onClick={() => onUndo(job)}
                  className="text-red-600"
                >
                  Hoàn tác
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);
