/**
 * Bộ phát hiện ngữ cảnh phủ định trong tiếng Việt tự nhiên (Negation Context Engine)
 * Xử lý các mẫu câu từ chối, hủy, không có nhu cầu như:
 * - "không đăng ký đâu", "chưa muốn học", "đừng gọi nữa", "ko cần tư vấn"
 */

import { containsNormalizedPhrase, normalize } from '../text-normalizer.js';
import {
  DEFAULT_NEGATION_POST_TERMS,
  DEFAULT_NEGATION_TERMS,
  DEFAULT_SCORING_THRESHOLDS_CONFIG,
} from './scoring.constants.js';

/**
 * Kiểm tra xem một từ khóa mục tiêu (ví dụ "dang ky", "hoc", "tu van")
 * có bị phủ định trong câu văn hay không.
 *
 * @param normalizedText Văn bản đã qua hàm normalize() (chữ thường, không dấu)
 * @param normalizedKeyword Từ khóa quy tắc (chữ thường, không dấu)
 * @param maxWindowDistance Khoảng cách số từ tối đa về phía trước để phát hiện từ phủ định (mặc định 4 từ)
 */
export function isKeywordNegated(
  normalizedText: string,
  normalizedKeyword: string,
  maxWindowDistance: number = DEFAULT_SCORING_THRESHOLDS_CONFIG.NEGATION_WINDOW_WORDS,
  negationTerms: string[] = [...DEFAULT_NEGATION_TERMS],
  negationPostTerms: string[] = [...DEFAULT_NEGATION_POST_TERMS],
): boolean {
  if (!normalizedText || !normalizedKeyword) return false;

  const cleanText = normalize(normalizedText);
  const cleanKeyword = normalize(normalizedKeyword);

  // Tách câu thành các mệnh đề/cụm từ theo dấu chấm câu hoặc liên từ ngắt
  const clauses = cleanText.split(/[,.;!?\n]+/).map((c) => c.trim()).filter(Boolean);

  for (const clause of clauses) {
    if (!clause.includes(cleanKeyword)) continue;

    const words = clause.split(/\s+/);
    const keywordTokens = cleanKeyword.split(/\s+/);
    const kwLength = keywordTokens.length;

    // Tìm tất cả vị trí xuất hiện của keyword trong mệnh đề
    for (let i = 0; i <= words.length - kwLength; i++) {
      const windowTokens = words.slice(i, i + kwLength);
      if (windowTokens.join(' ') === cleanKeyword) {
        // 1. Kiểm tra tiền từ (Prefix Window): 1 đến maxWindowDistance từ đứng ngay trước
        const startIndex = Math.max(0, i - maxWindowDistance);
        const prefixTokens = words.slice(startIndex, i);
        const prefixStr = prefixTokens.join(' ');

        if (negationTerms.some((marker) => containsNormalizedPhrase(prefixStr, normalize(marker)))) return true;

        const endIndex = Math.min(words.length, i + kwLength + maxWindowDistance);
        const suffixTokens = words.slice(i + kwLength, endIndex);
        const suffixStr = suffixTokens.join(' ');

        if (negationPostTerms.some((marker) => containsNormalizedPhrase(suffixStr, normalize(marker)))) return true;
      }
    }
  }

  return false;
}
