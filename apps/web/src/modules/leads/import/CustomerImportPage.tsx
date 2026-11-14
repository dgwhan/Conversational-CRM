import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button.js';
import { Alert } from '../../../components/ui/Alert.js';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { confirmDialog } from '../../../components/feedback/confirmDialog.js';
import { apiClient } from '../../../lib/api-client/index.js';
import type {
  CustomerImportJob,
  CustomerImportRequest,
  CustomerImportRow,
  CustomerImportRowResult,
  CustomerImportSummary,
  DuplicateStrategy,
} from '../../../lib/api-client/customer-import.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { ROUTES } from '../../../config/routes.js';
import { readSpreadsheet, type SheetData } from './spreadsheetReader.js';
import {
  IMPORT_FIELDS,
  actionLabel,
  autoMapColumns,
  downloadIssues,
  downloadTemplate,
  type ColumnMapping,
} from './importFields.js';
import { ImportHistory } from './ImportHistory.js';

type Step = 'upload' | 'map' | 'preview' | 'done';
const MAX_ROWS = 5000;
const PREVIEW_LIMIT = 200;

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'upload', label: 'Chọn file' },
  { id: 'map', label: 'Ghép cột' },
  { id: 'preview', label: 'Kiểm tra' },
  { id: 'done', label: 'Hoàn tất' },
];

const DUPLICATE_OPTIONS: Array<{ value: DuplicateStrategy; label: string; description: string }> = [
  { value: 'SKIP', label: 'Bỏ qua', description: 'Giữ nguyên khách đã có, không thay đổi gì.' },
  { value: 'FILL_EMPTY', label: 'Điền trường trống', description: 'Chỉ bổ sung thông tin còn thiếu, gộp thêm tag và ngành.' },
  { value: 'OVERWRITE', label: 'Ghi đè', description: 'Thay thông tin cũ bằng dữ liệu trong file (không xóa trường file để trống).' },
];

const ACTION_STYLES: Record<CustomerImportRowResult['action'], string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  SKIP: 'bg-slate-50 text-slate-600 border-slate-200',
  ERROR: 'bg-red-50 text-red-700 border-red-200',
};

export const CustomerImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useWorkspaceConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('SKIP');
  const [defaultStage, setDefaultStage] = useState('');
  const [defaultStatus, setDefaultStatus] = useState('NEW');
  const [defaultSource, setDefaultSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ summary: CustomerImportSummary; rows: CustomerImportRowResult[] } | null>(null);
  const [rowFilter, setRowFilter] = useState<'ALL' | 'ISSUES'>('ALL');
  const [result, setResult] = useState<{ job: CustomerImportJob; summary: CustomerImportSummary; rows: CustomerImportRowResult[] } | null>(null);
  const [jobs, setJobs] = useState<CustomerImportJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const stages = useMemo(
    () => [...(config.pipelineStages ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [config.pipelineStages],
  );

  useEffect(() => {
    if (!defaultStage && stages[0]) setDefaultStage(stages[0].id);
  }, [defaultStage, stages]);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      setJobs(await apiClient.customerImportApi.listJobs());
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const mappedFields = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);
  const missingRequired = !mappedFields.has('fullName')
    ? 'Chưa ghép cột "Họ và tên".'
    : !mappedFields.has('phone') && !mappedFields.has('email')
      ? 'Cần ghép ít nhất cột "Số điện thoại" hoặc "Email".'
      : '';

  // ───────────── Bước 1: đọc file ─────────────
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const data = await readSpreadsheet(file);
      if (data.rows.length === 0) throw new Error('File không có dòng dữ liệu nào (dòng đầu tiên phải là tiêu đề cột).');
      if (data.rows.length > MAX_ROWS) {
        throw new Error(`File có ${data.rows.length.toLocaleString('vi-VN')} dòng, vượt giới hạn ${MAX_ROWS.toLocaleString('vi-VN')} dòng mỗi lần nhập.`);
      }
      setFileName(file.name);
      setSheet(data);
      setMapping(autoMapColumns(data.headers));
      setPreview(null);
      setResult(null);
      setStep('map');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đọc được file.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const buildRequest = (): CustomerImportRequest => {
    const rows: CustomerImportRow[] = (sheet?.rows ?? []).map((cells) => {
      const row: CustomerImportRow = {};
      Object.entries(mapping).forEach(([idx, field]) => {
        if (!field) return;
        const value = (cells[Number(idx)] ?? '').trim();
        if (value) row[field] = row[field] ? `${row[field]}, ${value}` : value;
      });
      return row;
    });
    return {
      fileName,
      rows,
      duplicateStrategy,
      defaults: {
        leadStage: defaultStage || undefined,
        leadStatus: defaultStatus || undefined,
        source: defaultSource.trim() || undefined,
      },
    };
  };

  // ───────────── Bước 2 → 3: chạy thử ─────────────
  const runPreview = async () => {
    if (missingRequired) return;
    setBusy(true);
    setError('');
    try {
      setPreview(await apiClient.customerImportApi.preview(buildRequest()));
      setRowFilter('ALL');
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không kiểm tra được dữ liệu.');
    } finally {
      setBusy(false);
    }
  };

  // ───────────── Bước 3 → 4: ghi dữ liệu ─────────────
  const runCommit = async () => {
    if (!preview) return;
    const { createCount, updateCount } = preview.summary;
    if (createCount + updateCount === 0) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiClient.customerImportApi.commit(buildRequest());
      setResult(res);
      setStep('done');
      notify.success(`Đã nhập ${res.summary.createCount} khách mới, cập nhật ${res.summary.updateCount} khách.`);
      loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nhập dữ liệu thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setSheet(null);
    setFileName('');
    setPreview(null);
    setResult(null);
    setError('');
  };

  const handleUndo = async (job: CustomerImportJob) => {
    const ok = await confirmDialog({
      title: 'Hoàn tác lần nhập này?',
      message: `${job.createdCount} khách hàng do file "${job.fileName}" tạo ra sẽ bị xóa vĩnh viễn, trừ những khách đã có hội thoại, deal hoặc lịch hẹn. Các thay đổi lên khách có sẵn không được hoàn tác.`,
      confirmText: 'Hoàn tác',
      tone: 'danger',
    });
    if (!ok) return;
    setUndoingId(job.id);
    try {
      const res = await apiClient.customerImportApi.undo(job.id);
      notify.success(
        res.keptCount > 0
          ? `Đã xóa ${res.deletedCount} khách. Giữ lại ${res.keptCount} khách đã phát sinh dữ liệu.`
          : `Đã xóa ${res.deletedCount} khách hàng.`,
      );
      loadJobs();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không hoàn tác được.');
    } finally {
      setUndoingId(null);
    }
  };

  const handleJobIssues = async (job: CustomerImportJob) => {
    try {
      const issues = await apiClient.customerImportApi.getJobIssues(job.id);
      // Còn giữ dữ liệu gốc của file vừa nhập thì xuất kèm, không thì chỉ xuất thông tin tóm tắt
      const sameFile = result?.job.id === job.id && sheet;
      downloadIssues(job.fileName, sheet?.headers ?? [], sameFile ? sheet.rows : null, issues);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Không tải được file lỗi.');
    }
  };

  const viewCustomers = (jobId: string) => navigate(`${ROUTES.LEADS}?importJobId=${encodeURIComponent(jobId)}`);

  const previewRows = useMemo(() => {
    const rows = preview?.rows ?? [];
    const filtered = rowFilter === 'ISSUES' ? rows.filter((r) => r.action === 'ERROR' || r.action === 'SKIP') : rows;
    return filtered.slice(0, PREVIEW_LIMIT);
  }, [preview, rowFilter]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-slate-50/70">
      {/* Tiêu đề */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(ROUTES.LEADS)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label="Quay lại danh sách Lead"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="m-0 text-base font-bold text-slate-900 sm:text-lg">Nhập khách hàng từ file</h1>
              <p className="m-0 mt-0.5 text-xs text-slate-500">
                Danh sách thí sinh từ ngày hội tư vấn, Google Form hoặc Excel. Hỗ trợ CSV và XLSX, tối đa {MAX_ROWS.toLocaleString('vi-VN')} dòng.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={downloadTemplate}>
            Tải file mẫu
          </Button>
        </div>

        <ol className="m-0 mt-4 flex list-none gap-1.5 overflow-x-auto p-0 text-xs">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${
                i === stepIndex
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : i < stepIndex
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              <span>{i + 1}</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid min-w-0 flex-1 gap-4 p-3 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          {error && (
            <Alert variant="danger" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* ───────── Bước 1 ───────── */}
          {step === 'upload' && (
            <section
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-white px-4 py-12 text-center transition-colors ${
                dragOver ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200'
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <p className="m-0 text-sm font-semibold text-slate-800">Kéo thả file vào đây hoặc chọn từ máy</p>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  .xlsx hoặc .csv (UTF-8), tối đa 5MB. Dòng đầu tiên là tiêu đề cột. File được đọc ngay trên trình duyệt.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button icon={<Upload size={15} />} loading={busy} onClick={() => fileInputRef.current?.click()}>
                Chọn file
              </Button>
            </section>
          )}

          {/* ───────── Bước 2 ───────── */}
          {step === 'map' && sheet && (
            <>
              <section className="rounded-xl border border-slate-200 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="min-w-0">
                    <h2 className="m-0 text-sm font-bold text-slate-800">Ghép cột trong file với thông tin khách hàng</h2>
                    <p className="m-0 mt-0.5 truncate text-xs text-slate-500">
                      {fileName} · {sheet.rows.length.toLocaleString('vi-VN')} dòng · {sheet.headers.length} cột
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Chọn file khác
                  </Button>
                </header>
                <div className="divide-y divide-slate-100">
                  {sheet.headers.map((header, idx) => {
                    const sample = sheet.rows.slice(0, 3).map((r) => r[idx]).filter(Boolean).join(' · ');
                    return (
                      <div key={idx} className="grid gap-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center">
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-semibold text-slate-700">{header}</p>
                          <p className="m-0 truncate text-[11px] text-slate-400">{sample || '(trống)'}</p>
                        </div>
                        <select
                          value={mapping[idx] ?? ''}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [idx]: e.target.value as ColumnMapping[number] }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700"
                          aria-label={`Trường cho cột ${header}`}
                        >
                          <option value="">— Không nhập cột này —</option>
                          {IMPORT_FIELDS.map((f) => (
                            <option
                              key={f.field}
                              value={f.field}
                              disabled={mappedFields.has(f.field) && mapping[idx] !== f.field && f.field !== 'notes' && f.field !== 'tags'}
                            >
                              {f.label}
                              {f.required ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="m-0 text-sm font-bold text-slate-800">Tùy chọn</h2>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    Giai đoạn mặc định
                    <select
                      value={defaultStage}
                      onChange={(e) => setDefaultStage(e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-700"
                    >
                      {stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    Trạng thái mặc định
                    <select
                      value={defaultStatus}
                      onChange={(e) => setDefaultStatus(e.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-700"
                    >
                      <option value="NEW">Mới</option>
                      <option value="POTENTIAL">Tiềm năng</option>
                      <option value="QUALIFIED">Đủ điều kiện</option>
                      <option value="CONVERTED">Đã chuyển đổi</option>
                      <option value="UNQUALIFIED">Chưa phù hợp</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                    Nguồn
                    <input
                      value={defaultSource}
                      maxLength={150}
                      onChange={(e) => setDefaultSource(e.target.value)}
                      placeholder="VD: Ngày hội tư vấn 2026"
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-700"
                    />
                  </label>
                </div>
                <p className="m-0 text-[11px] text-slate-500">
                  Giá trị mặc định dùng cho dòng để trống cột tương ứng và không ghi đè lên khách hàng đã có.
                </p>

                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-2 p-0 text-xs font-semibold text-slate-600">
                    Khi SĐT hoặc email đã có trong hệ thống
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {DUPLICATE_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 ${
                          duplicateStrategy === opt.value ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <input
                            type="radio"
                            name="duplicateStrategy"
                            value={opt.value}
                            checked={duplicateStrategy === opt.value}
                            onChange={() => setDuplicateStrategy(opt.value)}
                          />
                          {opt.label}
                        </span>
                        <span className="text-[11px] text-slate-500">{opt.description}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                {missingRequired && <p className="m-0 text-xs font-semibold text-amber-700 sm:mr-auto">{missingRequired}</p>}
                <Button variant="outline" onClick={reset}>
                  Hủy
                </Button>
                <Button onClick={runPreview} loading={busy} disabled={Boolean(missingRequired)}>
                  Kiểm tra dữ liệu
                </Button>
              </div>
            </>
          )}

          {/* ───────── Bước 3 ───────── */}
          {step === 'preview' && preview && (
            <>
              <SummaryCards summary={preview.summary} />
              <section className="rounded-xl border border-slate-200 bg-white">
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div className="flex gap-1">
                    {(['ALL', 'ISSUES'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setRowFilter(f)}
                        className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                          rowFilter === f ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {f === 'ALL' ? 'Tất cả dòng' : `Lỗi & bỏ qua (${preview.summary.errorCount + preview.summary.skipCount})`}
                      </button>
                    ))}
                  </div>
                  {preview.summary.errorCount + preview.summary.skipCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Download size={13} />}
                      onClick={() =>
                        downloadIssues(
                          fileName,
                          sheet?.headers ?? [],
                          sheet?.rows ?? null,
                          preview.rows.filter((r) => r.action === 'ERROR' || r.action === 'SKIP'),
                        )
                      }
                    >
                      Tải dòng lỗi
                    </Button>
                  )}
                </header>
                <RowsTable rows={previewRows} />
                {(rowFilter === 'ALL' ? preview.rows.length : preview.summary.errorCount + preview.summary.skipCount) >
                  PREVIEW_LIMIT && (
                  <p className="m-0 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
                    Hiển thị {PREVIEW_LIMIT} dòng đầu. Tải file lỗi để xem đầy đủ.
                  </p>
                )}
              </section>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                {preview.summary.createCount + preview.summary.updateCount === 0 && (
                  <p className="m-0 text-xs font-semibold text-amber-700 sm:mr-auto">Không có dòng nào để nhập.</p>
                )}
                <Button variant="outline" onClick={() => setStep('map')}>
                  Quay lại ghép cột
                </Button>
                <Button
                  onClick={runCommit}
                  loading={busy}
                  disabled={preview.summary.createCount + preview.summary.updateCount === 0}
                >
                  Nhập {preview.summary.createCount + preview.summary.updateCount} khách hàng
                </Button>
              </div>
            </>
          )}

          {/* ───────── Bước 4 ───────── */}
          {step === 'done' && result && (
            <>
              <section className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-8 text-center">
                <CheckCircle2 size={36} className="text-emerald-600" />
                <h2 className="m-0 text-base font-bold text-slate-900">Đã nhập xong “{result.job.fileName}”</h2>
                <p className="m-0 text-xs text-slate-500">
                  Có thể hoàn tác trong 24 giờ ở mục Lịch sử nhập.
                </p>
              </section>
              <SummaryCards summary={result.summary} />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                {result.summary.errorCount + result.summary.skipCount > 0 && (
                  <Button
                    variant="outline"
                    icon={<Download size={14} />}
                    onClick={() =>
                      downloadIssues(
                        fileName,
                        sheet?.headers ?? [],
                        sheet?.rows ?? null,
                        result.rows.filter((r) => r.action === 'ERROR' || r.action === 'SKIP'),
                      )
                    }
                  >
                    Tải dòng lỗi
                  </Button>
                )}
                <Button variant="outline" icon={<RefreshCw size={14} />} onClick={reset}>
                  Nhập file khác
                </Button>
                {result.summary.createCount > 0 && (
                  <Button icon={<Users size={14} />} onClick={() => viewCustomers(result.job.id)}>
                    Xem {result.summary.createCount} khách mới
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="min-w-0">
          <ImportHistory
            jobs={jobs}
            loading={jobsLoading}
            undoingId={undoingId}
            onUndo={handleUndo}
            onViewCustomers={(job) => viewCustomers(job.id)}
            onDownloadIssues={handleJobIssues}
          />
        </aside>
      </div>
    </div>
  );
};

const SummaryCards: React.FC<{ summary: CustomerImportSummary }> = ({ summary }) => {
  const cards = [
    { label: 'Tạo mới', value: summary.createCount, className: 'text-emerald-700' },
    { label: 'Cập nhật', value: summary.updateCount, className: 'text-blue-700' },
    { label: 'Bỏ qua', value: summary.skipCount, className: 'text-slate-600' },
    { label: 'Lỗi', value: summary.errorCount, className: 'text-red-700' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
          <p className={`m-0 mt-1 text-xl font-bold tabular-nums ${c.className}`}>{c.value.toLocaleString('vi-VN')}</p>
        </div>
      ))}
    </div>
  );
};

const RowsTable: React.FC<{ rows: CustomerImportRowResult[] }> = ({ rows }) => {
  if (rows.length === 0) {
    return <p className="m-0 px-4 py-6 text-center text-xs text-slate-500">Không có dòng nào.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2 font-semibold">Dòng</th>
            <th className="px-2 py-2 font-semibold">Kết quả</th>
            <th className="px-2 py-2 font-semibold">Họ tên</th>
            <th className="px-2 py-2 font-semibold">SĐT / Email</th>
            <th className="px-4 py-2 font-semibold">Ghi chú</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.row} className="align-top">
              <td className="px-4 py-2 tabular-nums text-slate-500">{r.row + 1}</td>
              <td className="px-2 py-2">
                <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-semibold ${ACTION_STYLES[r.action]}`}>
                  {actionLabel(r.action)}
                </span>
              </td>
              <td className="px-2 py-2 font-semibold text-slate-800">{r.fullName || '—'}</td>
              <td className="px-2 py-2 text-slate-600">
                {[r.phone, r.email].filter(Boolean).join(' · ') || '—'}
              </td>
              <td className="px-4 py-2 text-slate-600">{r.messages.join(' ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
