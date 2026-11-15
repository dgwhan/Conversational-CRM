import type { KeywordRuleItem } from '../../../../../../../lib/api-client/keyword-rules.js';

/**
 * Phân tích danh sách từ khóa thô từ textarea (phân cách bằng dấu phẩy hoặc xuống dòng).
 * Tự động loại bỏ khoảng trắng thừa, trùng lặp không phân biệt hoa thường và từ quá dài (> 200 ký tự).
 */
export function parseBulkKeywordText(rawText: string): string[] {
  if (!rawText.trim()) return [];
  const lines = rawText.split(/[\n,]+/);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed.toLowerCase()) && trimmed.length <= 200) {
      seen.add(trimmed.toLowerCase());
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Gom nhóm từ khóa theo tên nhóm (Category/Group), sắp xếp theo thứ tự chữ cái tiếng Việt.
 */
export function groupKeywordsByCategory<T extends { group?: string }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const g = item.group?.trim() || 'Chưa phân nhóm';
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(item);
  }
  return map;
}

/**
 * Lọc danh sách từ khóa theo từ khóa tìm kiếm, nhóm và trạng thái.
 */
export function filterKeywordRules(
  rules: KeywordRuleItem[],
  searchQuery: string,
  selectedGroup: string,
  selectedStatus: 'ALL' | 'ACTIVE' | 'INACTIVE',
): KeywordRuleItem[] {
  const q = searchQuery.trim().toLowerCase();
  return rules.filter((rule) => {
    if (selectedGroup !== 'ALL' && rule.group !== selectedGroup) return false;
    if (selectedStatus === 'ACTIVE' && !rule.isActive) return false;
    if (selectedStatus === 'INACTIVE' && rule.isActive) return false;
    if (!q) return true;
    return (
      rule.keyword.toLowerCase().includes(q) ||
      rule.group.toLowerCase().includes(q) ||
      (rule.description && rule.description.toLowerCase().includes(q))
    );
  });
}

