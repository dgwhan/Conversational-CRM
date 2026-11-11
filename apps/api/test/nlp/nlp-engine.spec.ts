import { describe, it, expect } from 'vitest';
import { normalize } from '../../src/modules/nlp/text-normalizer.js';
import { extractEntities, extractPhoneNumber } from '../../src/modules/nlp/entity-extractor.js';
import {
  evaluateKeywordRules,
  type KeywordRuleItem,
} from '../../src/modules/nlp/keyword-scoring.js';

describe('NLP & Information Extraction Engine', () => {
  describe('1. Hàm normalize() - Chuẩn hóa văn bản tiếng Việt', () => {
    it('không mở rộng các từ viết tắt thành quy tắc nghiệp vụ gán cứng', () => {
      const input = 'HP bn vậy ạ';
      const output = normalize(input);

      expect(output).toBe('hp bn vay a');
    });

    it('rút gọn ký tự lặp do teencode: "họcccc phí" -> "hoc phi"', () => {
      const input = 'họcccc phí';
      const output = normalize(input);

      expect(output).toBe('hoc phi');
    });

    it('rút gọn ký tự lặp kéo dài: "dạaaaaaa bao nhiuuuu zậy" -> chuẩn hóa', () => {
      const input = 'dạaaaaaa bao nhiuuuu zậy';
      const output = normalize(input);

      expect(output).toContain('da');
      expect(output).toContain('bao nhiu');
    });

    it('giữ nguyên từ viết tắt để workspace tự khai báo tiêu chí phù hợp', () => {
      expect(normalize('ib sdt dk')).toBe('ib sdt dk');
    });
  });

  describe('2. Trích xuất Thực thể Nghiệp vụ (SĐT CUS-03, Hồ sơ, Khóa học)', () => {
    it('tiêu chí hoàn thành: "em gửi cccd với học bạ, sđt 0912345678" trả đủ 3 loại thông tin', () => {
      const input = 'em gửi cccd với học bạ, sđt 0912345678';
      const result = extractEntities(input);

      // 1. Số điện thoại chuẩn CUS-03
      expect(result.phoneNumber).toBe('0912345678');

      // 2. Danh sách hồ sơ đính kèm
      expect(result.documents).toContain('CCCD');
      expect(result.documents).toContain('Học bạ');
      expect(result.documents).toHaveLength(2);

      // 3. Khóa học (rỗng vì không nhắc trong câu)
      expect(result.detectedCourses).toEqual([]);
    });

    it('trích xuất SĐT có định dạng chấm hoặc khoảng cách theo CUS-03', () => {
      expect(extractPhoneNumber('Alo tư vấn qua số 0912.345.678 nhé')).toBe('0912345678');
      expect(extractPhoneNumber('Số của mẹ em là +84 988 777 666')).toBe('0988777666');
    });

    it('trích xuất khóa học từ danh mục sản phẩm (productCatalog)', () => {
      const catalog = [
        { id: 'c1', name: 'Lập trình viên Quốc tế Aptech ADSE', code: 'APTECH-ADSE' },
        { id: 'c2', name: 'Thiết kế Đồ họa Multimedia Arena', code: 'ARENA' },
        { id: 'c3', name: 'Lập trình Python & Trí tuệ Nhân tạo AI', code: 'AI-PYTHON' },
      ];

      const input = 'Em muốn hỏi học phí khóa lập trình python ai, sđt 0909123456';
      const result = extractEntities(input, catalog);

      expect(result.phoneNumber).toBe('0909123456');
      expect(result.detectedCourses.length).toBeGreaterThanOrEqual(1);
      expect(result.detectedCourses[0].name).toContain('Python');
    });
  });

  describe('3. Bảng luật từ khóa động (keyword_rules) & Chấm điểm Lead', () => {
    it('không tự áp dụng tiêu chí khi workspace chưa tạo luật', () => {
      const result = evaluateKeywordRules('gói dịch vụ cao cấp');

      expect(result.totalScore).toBe(0);
      expect(result.matchedRules).toHaveLength(0);
    });

    it('tiêu chí hoàn thành: đổi trọng số trong bảng thì kết quả đổi theo mà không sửa code', () => {
      const input = 'Tôi muốn gói vàng';
      const customRules: KeywordRuleItem[] = [
        { id: 'one', group: 'ý định mua', keyword: 'gói vàng', weight: 5, isActive: true },
      ];
      const scoreOriginal = evaluateKeywordRules(input, customRules);
      expect(scoreOriginal.totalScore).toBe(5);

      const modifiedRules: KeywordRuleItem[] = customRules.map((rule) => ({ ...rule, weight: 100 }));

      const scoreModified = evaluateKeywordRules(input, modifiedRules);
      expect(scoreModified.totalScore).toBe(100);

      const disabledRules: KeywordRuleItem[] = modifiedRules.map((r) => {
        return { ...r, isActive: false };
      });

      const scoreDisabled = evaluateKeywordRules(input, disabledRules);
      expect(scoreDisabled.totalScore).toBe(0);
    });

    it('đánh dấu loại trừ theo trọng số cấu hình thay vì tên nhóm cố định', () => {
      const result = evaluateKeywordRules(
        'not a fit',
        [{ id: 'exclude', group: 'custom group', keyword: 'not a fit', weight: -80, isActive: true }],
        -50,
      );

      expect(result.isExcluded).toBe(true);
      expect(result.totalScore).toBeLessThan(0);
    });

  });
});
