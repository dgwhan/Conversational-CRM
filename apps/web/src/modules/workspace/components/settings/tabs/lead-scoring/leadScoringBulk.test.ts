import { describe, expect, it } from 'vitest';
import {
  parseBulkKeywordText,
  groupKeywordsByCategory,
} from './rules/utils.js';

describe('Lead Scoring Bulk Keyword Utilities', () => {
  it('correctly parses comma-separated and newline-separated keywords', () => {
    const raw = `học phí, học bổng, khai giảng\nchương trình cử nhân\nhẹn tư vấn`;
    const parsed = parseBulkKeywordText(raw);
    expect(parsed).toEqual([
      'học phí',
      'học bổng',
      'khai giảng',
      'chương trình cử nhân',
      'hẹn tư vấn',
    ]);
  });

  it('deduplicates case-insensitively and filters empty entries', () => {
    const raw = `Học phí,   , học phí, HỌC PHÍ\n học bổng \n\n `;
    const parsed = parseBulkKeywordText(raw);
    expect(parsed).toEqual(['Học phí', 'học bổng']);
  });

  it('groups keywords by their category name and handles undefined/empty groups', () => {
    const items = [
      { id: '1', group: 'Học phí', keyword: 'chi phí' },
      { id: '2', group: 'Học phí', keyword: 'giá tiền' },
      { id: '3', group: 'Lộ trình', keyword: 'thời gian học' },
      { id: '4', group: '', keyword: 'khác' },
    ];
    const grouped = groupKeywordsByCategory(items);
    expect(grouped.get('Học phí')?.length).toBe(2);
    expect(grouped.get('Lộ trình')?.length).toBe(1);
    expect(grouped.get('Chưa phân nhóm')?.length).toBe(1);
  });
});

