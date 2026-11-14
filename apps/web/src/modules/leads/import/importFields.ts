import type { CustomerImportField, CustomerImportRowResult } from '../../../lib/api-client/customer-import.js';

export interface ImportFieldDef {
  field: CustomerImportField;
  label: string;
  hint?: string;
  required?: boolean;
  /** Các tên cột hay gặp (đã bỏ dấu, chữ thường) dùng để tự ghép cột */
  aliases: string[];
}

export const IMPORT_FIELDS: ImportFieldDef[] = [
  { field: 'fullName', label: 'Họ và tên', required: true, aliases: ['ho va ten', 'ho ten', 'ten', 'full name', 'fullname', 'name', 'ten thi sinh', 'ten hoc sinh', 'hoc vien'] },
  { field: 'phone', label: 'Số điện thoại', hint: 'Cần SĐT hoặc email', aliases: ['so dien thoai', 'sdt', 'dien thoai', 'phone', 'mobile', 'di dong', 'so dt', 'dt'] },
  { field: 'email', label: 'Email', hint: 'Cần SĐT hoặc email', aliases: ['email', 'e-mail', 'mail', 'thu dien tu'] },
  { field: 'dateOfBirth', label: 'Ngày sinh', hint: 'dd/mm/yyyy', aliases: ['ngay sinh', 'ngay thang nam sinh', 'sinh ngay', 'dob', 'birthday', 'date of birth'] },
  { field: 'school', label: 'Trường', aliases: ['truong', 'truong thpt', 'truong hoc', 'school', 'don vi'] },
  { field: 'address', label: 'Địa chỉ', aliases: ['dia chi', 'address', 'que quan', 'tinh thanh', 'noi o'] },
  { field: 'idCard', label: 'CCCD', aliases: ['cccd', 'cmnd', 'can cuoc', 'so cccd', 'id card'] },
  { field: 'interestCourses', label: 'Ngành / khóa quan tâm', hint: 'Nhiều giá trị cách nhau bởi dấu phẩy', aliases: ['nganh', 'nganh quan tam', 'khoa hoc', 'khoa quan tam', 'nguyen vong', 'course', 'courses', 'chuong trinh'] },
  { field: 'leadStage', label: 'Giai đoạn', hint: 'Tên giai đoạn trong pipeline', aliases: ['giai doan', 'stage', 'pipeline', 'buoc'] },
  { field: 'leadStatus', label: 'Trạng thái', hint: 'Mới / Tiềm năng / Đã chuyển đổi / Chưa phù hợp', aliases: ['trang thai', 'status', 'tinh trang'] },
  { field: 'source', label: 'Nguồn', aliases: ['nguon', 'source', 'kenh', 'nguon khach'] },
  { field: 'tags', label: 'Tag', hint: 'Cách nhau bởi dấu phẩy', aliases: ['tag', 'tags', 'nhan', 'the'] },
  { field: 'notes', label: 'Ghi chú', aliases: ['ghi chu', 'note', 'notes', 'mo ta', 'nhan xet'] },
  { field: 'assigneeEmail', label: 'Email người phụ trách', hint: 'Email thành viên workspace', aliases: ['nguoi phu trach', 'phu trach', 'tu van vien', 'email tu van vien', 'assignee', 'owner', 'nhan vien'] },
];

export type ColumnMapping = Record<number, CustomerImportField | ''>;

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[_*:().]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Tự ghép tiêu đề cột trong file với trường CRM (mỗi trường chỉ ghép một cột). */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<CustomerImportField>();
  const normalized = headers.map(normalize);

  // Ưu tiên khớp chính xác, sau đó mới khớp "chứa"
  for (const exact of [true, false]) {
    normalized.forEach((h, idx) => {
      if (mapping[idx]) return;
      const def = IMPORT_FIELDS.find(
        (f) => !used.has(f.field) && f.aliases.some((a) => (exact ? h === a : h.includes(a) && a.length >= 3)),
      );
      if (def) {
        mapping[idx] = def.field;
        used.add(def.field);
      }
    });
  }
  headers.forEach((_, idx) => {
    if (mapping[idx] === undefined) mapping[idx] = '';
  });
  return mapping;
}

/** Đánh dấu UTF-8 để Excel hiển thị đúng tiếng Việt */
const UTF8_BOM = String.fromCharCode(0xfeff);

/** Chặn công thức khi mở CSV bằng Excel (CSV injection). */
const safeCell = (value: string): string => {
  const v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function toCsv(rows: string[][]): string {
  return UTF8_BOM + rows.map((r) => r.map((c) => safeCell(c ?? '')).join(',')).join('\r\n');
}

export function downloadCsv(fileName: string, rows: string[][]): void {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadTemplate(): void {
  downloadCsv('mau-nhap-khach-hang.csv', [
    IMPORT_FIELDS.map((f) => f.label),
    [
      'Nguyễn Văn An',
      '0912345678',
      'an.nguyen@gmail.com',
      '05/09/2008',
      'THPT Châu Văn Liêm',
      'Ninh Kiều, Cần Thơ',
      '',
      'Công nghệ thông tin',
      '',
      'Tiềm năng',
      'Ngày hội tư vấn 2026',
      'Hội chợ',
      'Quan tâm học bổng',
      '',
    ],
  ]);
}

const ACTION_LABELS: Record<CustomerImportRowResult['action'], string> = {
  CREATE: 'Tạo mới',
  UPDATE: 'Cập nhật',
  SKIP: 'Bỏ qua',
  ERROR: 'Lỗi',
};

export function actionLabel(action: CustomerImportRowResult['action']): string {
  return ACTION_LABELS[action];
}

/** File các dòng lỗi / bỏ qua: giữ nguyên dữ liệu gốc + cột lý do để sửa rồi nhập lại. */
export function downloadIssues(
  fileName: string,
  headers: string[],
  sourceRows: string[][] | null,
  issues: CustomerImportRowResult[],
): void {
  const base = fileName.replace(/\.[^.]+$/, '');
  if (sourceRows) {
    downloadCsv(`${base}-loi.csv`, [
      ['Dòng', 'Kết quả', 'Lý do', ...headers],
      ...issues.map((i) => [String(i.row + 1), actionLabel(i.action), i.messages.join(' '), ...(sourceRows[i.row - 1] ?? [])]),
    ]);
    return;
  }
  downloadCsv(`${base}-loi.csv`, [
    ['Dòng', 'Kết quả', 'Họ tên', 'SĐT', 'Email', 'Lý do'],
    ...issues.map((i) => [String(i.row + 1), actionLabel(i.action), i.fullName ?? '', i.phone ?? '', i.email ?? '', i.messages.join(' ')]),
  ]);
}
