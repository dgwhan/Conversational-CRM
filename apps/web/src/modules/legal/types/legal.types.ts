/**
 * ============================================================================
 * POLARISX CONVERSATIONAL CRM - LEGAL TYPES
 * Các định nghĩa kiểu dữ liệu cho tài liệu pháp lý (Chính sách & Điều khoản)
 * ============================================================================
 */

export interface LegalTable {
  headers: string[];
  rows: string[][];
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
  paragraphsAfter?: string[];
  table?: LegalTable;
  note?: string;
}

export interface QuickSummaryItem {
  iconName: 'shield' | 'database' | 'lock' | 'user-check' | 'file-text' | 'scale' | 'alert-triangle' | 'clock';
  title: string;
  description: string;
}

export interface LegalDocument {
  title: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  documentType: 'privacy' | 'terms';
  subtitle: string;
  quickSummary: QuickSummaryItem[];
  sections: LegalSection[];
}
