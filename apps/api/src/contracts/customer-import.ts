import { z } from 'zod';

/** Số dòng tối đa của một lần import (file lớn hơn cần chia nhỏ). */
export const CUSTOMER_IMPORT_MAX_ROWS = 5000;
/** Chỉ được hoàn tác lô import trong khoảng thời gian này. */
export const CUSTOMER_IMPORT_UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Các trường CRM mà một cột trong file có thể ánh xạ tới. */
export const CUSTOMER_IMPORT_FIELDS = [
  'fullName',
  'phone',
  'email',
  'dateOfBirth',
  'school',
  'address',
  'idCard',
  'interestCourses',
  'leadStage',
  'leadStatus',
  'source',
  'tags',
  'notes',
  'assigneeEmail',
] as const;
export type CustomerImportField = (typeof CUSTOMER_IMPORT_FIELDS)[number];

/** Một dòng dữ liệu đã được frontend ánh xạ cột → trường CRM (giá trị thô dạng chuỗi). */
const cell = () => z.string().max(2000).nullable().optional();
export const CustomerImportRowSchema = z
  .object({
    fullName: cell(),
    phone: cell(),
    email: cell(),
    dateOfBirth: cell(),
    school: cell(),
    address: cell(),
    idCard: cell(),
    interestCourses: cell(),
    leadStage: cell(),
    leadStatus: cell(),
    source: cell(),
    tags: cell(),
    notes: cell(),
    assigneeEmail: cell(),
  } satisfies Record<CustomerImportField, ReturnType<typeof cell>>)
  .strip();
export type CustomerImportRow = z.infer<typeof CustomerImportRowSchema>;

export const DuplicateStrategySchema = z.enum(['SKIP', 'FILL_EMPTY', 'OVERWRITE']);
export type DuplicateStrategy = z.infer<typeof DuplicateStrategySchema>;

export const CustomerImportRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  rows: z.array(CustomerImportRowSchema).min(1, 'File không có dòng dữ liệu nào.').max(
    CUSTOMER_IMPORT_MAX_ROWS,
    `Mỗi lần import tối đa ${CUSTOMER_IMPORT_MAX_ROWS} dòng. Hãy chia nhỏ file.`,
  ),
  duplicateStrategy: DuplicateStrategySchema.default('SKIP'),
  /** Giá trị mặc định khi dòng để trống */
  defaults: z
    .object({
      leadStage: z.string().trim().max(50).optional(),
      leadStatus: z.string().trim().max(50).optional(),
      source: z.string().trim().max(150).optional(),
    })
    .default({}),
});
export type CustomerImportRequest = z.infer<typeof CustomerImportRequestSchema>;

export type CustomerImportRowAction = 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR';

export interface CustomerImportRowResult {
  /** Số thứ tự dòng dữ liệu, bắt đầu từ 1 (dòng tiêu đề không tính) */
  row: number;
  action: CustomerImportRowAction;
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  /** Lý do lỗi / bỏ qua */
  messages: string[];
  /** Khách hàng đã có trong hệ thống (khi trùng) */
  existingCustomerId?: string;
  existingCustomerName?: string;
}

export interface CustomerImportSummary {
  totalRows: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  errorCount: number;
}

export interface CustomerImportPreviewResponse {
  summary: CustomerImportSummary;
  rows: CustomerImportRowResult[];
}

export interface CustomerImportJobDto {
  id: string;
  fileName: string;
  status: 'COMPLETED' | 'UNDONE';
  duplicateStrategy: DuplicateStrategy;
  source: string | null;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  undoneCount: number;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  undoneAt: string | null;
  canUndo: boolean;
}

export interface CustomerImportCommitResponse {
  job: CustomerImportJobDto;
  summary: CustomerImportSummary;
  rows: CustomerImportRowResult[];
}

export interface CustomerImportUndoResponse {
  job: CustomerImportJobDto;
  deletedCount: number;
  /** Khách hàng đã phát sinh hội thoại / deal / hoạt động nên được giữ lại */
  keptCount: number;
}
