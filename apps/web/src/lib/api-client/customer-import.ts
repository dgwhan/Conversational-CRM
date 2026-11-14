import type { BaseApiClient } from './core.js';

export type CustomerImportField =
  | 'fullName'
  | 'phone'
  | 'email'
  | 'dateOfBirth'
  | 'school'
  | 'address'
  | 'idCard'
  | 'interestCourses'
  | 'leadStage'
  | 'leadStatus'
  | 'source'
  | 'tags'
  | 'notes'
  | 'assigneeEmail';

export type CustomerImportRow = Partial<Record<CustomerImportField, string>>;
export type DuplicateStrategy = 'SKIP' | 'FILL_EMPTY' | 'OVERWRITE';
export type CustomerImportRowAction = 'CREATE' | 'UPDATE' | 'SKIP' | 'ERROR';

export interface CustomerImportRequest {
  fileName: string;
  rows: CustomerImportRow[];
  duplicateStrategy: DuplicateStrategy;
  defaults: { leadStage?: string; leadStatus?: string; source?: string };
}

export interface CustomerImportRowResult {
  row: number;
  action: CustomerImportRowAction;
  fullName?: string;
  phone?: string | null;
  email?: string | null;
  messages: string[];
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

export interface CustomerImportJob {
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

export function createCustomerImportApi(client: BaseApiClient) {
  return {
    preview(body: CustomerImportRequest) {
      return client.post<{ summary: CustomerImportSummary; rows: CustomerImportRowResult[] }>(
        '/customers/import/preview',
        body,
      );
    },
    commit(body: CustomerImportRequest) {
      return client.post<{ job: CustomerImportJob; summary: CustomerImportSummary; rows: CustomerImportRowResult[] }>(
        '/customers/import',
        body,
      );
    },
    listJobs() {
      return client.get<CustomerImportJob[]>('/customers/import/jobs');
    },
    getJobIssues(jobId: string) {
      return client.get<CustomerImportRowResult[]>(`/customers/import/jobs/${encodeURIComponent(jobId)}/issues`);
    },
    undo(jobId: string) {
      return client.post<{ job: CustomerImportJob; deletedCount: number; keptCount: number }>(
        `/customers/import/jobs/${encodeURIComponent(jobId)}/undo`,
      );
    },
  };
}
