import type { KeywordRuleItem } from '../../src/modules/nlp/keyword-scoring.js';

export const benchmarkRules: KeywordRuleItem[] = [
  { id: 'price-quote', keyword: 'báo giá', weight: 3, group: 'interest', isActive: true },
  { id: 'price-list', keyword: 'bảng giá', weight: 3, group: 'interest', isActive: true },
  { id: 'cost', keyword: 'chi phí', weight: 3, group: 'interest', isActive: true },
  { id: 'pricing', keyword: 'giá cả', weight: 3, group: 'interest', isActive: true },
  { id: 'consultation', keyword: 'tư vấn', weight: 2, group: 'interest', isActive: true },
  { id: 'schedule', keyword: 'lịch', weight: 3, group: 'interest', isActive: true },
  { id: 'registration', keyword: 'đăng ký', weight: 5, group: 'conversion', isActive: true },
  { id: 'deposit', keyword: 'đặt cọc', weight: 5, group: 'conversion', isActive: true },
  { id: 'reserve', keyword: 'giữ chỗ', weight: 5, group: 'conversion', isActive: true },
  { id: 'contract', keyword: 'ký hợp đồng', weight: 5, group: 'conversion', isActive: true },
  { id: 'identity-document', keyword: 'cccd', weight: 3, group: 'documents', isActive: true },
  { id: 'profile', keyword: 'hồ sơ', weight: 3, group: 'documents', isActive: true },
  { id: 'recruiting', keyword: 'tuyển dụng', weight: -100, group: 'exclude', isActive: true },
  { id: 'job-application', keyword: 'ứng tuyển', weight: -100, group: 'exclude', isActive: true },
  { id: 'advertisement', keyword: 'quảng cáo', weight: -100, group: 'exclude', isActive: true },
  { id: 'sales-pitch', keyword: 'chào bán', weight: -100, group: 'exclude', isActive: true },
];
