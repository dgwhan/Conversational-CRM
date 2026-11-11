import { describe, it, expect } from 'vitest';
import {
  scoreConversation,
  type ScoringThresholdConfig,
  type ConversationMessageInput,
} from '../../src/modules/nlp/domain/conversation-scoring.js';
import { isKeywordNegated } from '../../src/modules/nlp/domain/negation-detector.js';
import { ConversationClassificationService } from '../../src/modules/nlp/application/conversation-classification.service.js';
import { KeywordRulesService } from '../../src/modules/nlp/keyword-rules.service.js';
import type { KeywordRuleItem } from '../../src/modules/nlp/keyword-scoring.js';

describe('Conversation Scoring & Classification Engine', () => {
  // Bộ quy tắc chuẩn để kiểm thử các tiêu chí
  const standardRules: KeywordRuleItem[] = [
    { id: 'rule-hp', keyword: 'học phí', weight: 3, group: 'QUAN_TAM', isActive: true },
    { id: 'rule-dk', keyword: 'đăng ký', weight: 5, group: 'SAN_SANG_DANG_KY', isActive: true },
    { id: 'rule-gc', keyword: 'giữ chỗ', weight: 5, group: 'SAN_SANG_DANG_KY', isActive: true },
    { id: 'rule-nh', keyword: 'nhập học', weight: 5, group: 'SAN_SANG_DANG_KY', isActive: true },
    { id: 'rule-tv', keyword: 'tư vấn', weight: 2, group: 'QUAN_TAM', isActive: true },
    { id: 'rule-lh', keyword: 'lịch học', weight: 3, group: 'QUAN_TAM', isActive: true },
    { id: 'rule-cccd', keyword: 'cccd', weight: 3, group: 'HO_SO', isActive: true },
    { id: 'rule-hb', keyword: 'học bạ', weight: 3, group: 'HO_SO', isActive: true },
    { id: 'rule-spam', keyword: 'tuyển dụng', weight: -100, group: 'LOAI_TRU', isActive: true },
  ];

  it('uses workspace-defined negation terms for customer-defined rules', () => {
    const rules: KeywordRuleItem[] = [
      { id: 'subscribe', keyword: 'subscribe', weight: 8, group: 'custom', isActive: true },
    ];
    const result = scoreConversation(
      ['not subscribe'],
      rules,
      {
        negationTerms: ['not'],
        negationPostTerms: [],
        negationWindowWords: 2,
      },
    );

    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  describe('PHẦN 1: Phát hiện Phủ định (Negation Engine) & Câu từ chối', () => {
    it('1. Tiêu chí hoàn thành câu phủ định: "không đăng ký đâu" -> không tính điểm cho luật đăng ký', () => {
      const messages = ['Dạ em cảm ơn, em không đăng ký đâu ạ'];
      const result = scoreConversation(messages, standardRules);

      expect(isKeywordNegated('da em cam on em khong dang ky dau a', 'dang ky')).toBe(true);
      const dkReason = result.reasons.find((r) => r.keyword === 'đăng ký');
      expect(dkReason).toBeUndefined();
      expect(result.score).toBe(0);
      expect(result.tier).toBe('IRRELEVANT');
    });

    it('2. Câu phủ định với từ "chưa": "em chưa muốn học đâu ạ"', () => {
      expect(isKeywordNegated('em chua muon hoc dau a', 'hoc')).toBe(true);
      const result = scoreConversation(['em chưa muốn học đâu ạ'], standardRules);
      expect(result.score).toBe(0);
    });

    it('3. Câu phủ định với từ "đừng": "đừng tư vấn nữa nhé ad"', () => {
      expect(isKeywordNegated('dung tu van nua nhe ad', 'tu van')).toBe(true);
      const result = scoreConversation(['đừng tư vấn nữa nhé ad'], standardRules);
      expect(result.reasons.find((r) => r.keyword === 'tư vấn')).toBeUndefined();
    });

    it('4. Câu phủ định với từ "ko cần": "dạ ko cần tư vấn đâu"', () => {
      expect(isKeywordNegated('da ko can tu van dau', 'tu van')).toBe(true);
      const result = scoreConversation(['dạ ko cần tư vấn đâu'], standardRules);
      expect(result.score).toBe(0);
    });

    it('5. Câu phủ định với từ "hủy": "cho em hủy đăng ký giữ chỗ"', () => {
      expect(isKeywordNegated('cho em huy dang ky giu cho', 'dang ky')).toBe(true);
      const result = scoreConversation(['cho em hủy đăng ký giữ chỗ'], standardRules);
      expect(result.reasons.find((r) => r.keyword === 'đăng ký')).toBeUndefined();
    });

    it('6. Câu phủ định với từ "ko có nhu cầu": "mình ko có nhu cầu học nha"', () => {
      expect(isKeywordNegated('minh ko co nhu cau hoc nha', 'hoc')).toBe(true);
    });

    it('7. Câu phủ định có trợ từ "chi nữa": "học chi nữa bạn ơi"', () => {
      expect(isKeywordNegated('hoc chi nua ban oi', 'hoc')).toBe(true);
    });

    it('8. Phủ định ở vế trước nhưng vế sau đồng ý: "không học web, em đăng ký aptech"', () => {
      const messages = ['Em không học web, nhưng em muốn đăng ký khóa Aptech'];
      const result = scoreConversation(messages, standardRules);
      expect(result.reasons.some((r) => r.keyword === 'đăng ký')).toBe(true);
      expect(result.score).toBe(5);
    });

    it('9. Phủ định lặp từ teencode: "dạ k0 có nhu cầu đk đâu ạ"', () => {
      const result = scoreConversation(['dạ k0 có nhu cầu đk đâu ạ'], standardRules);
      expect(result.reasons.find((r) => r.keyword === 'đăng ký')).toBeUndefined();
      expect(result.score).toBe(0);
    });

    it('10. Phủ định với từ "thôi": "thôi mình không nhập học nữa"', () => {
      const result = scoreConversation(['thôi mình không nhập học nữa'], standardRules);
      expect(result.reasons.find((r) => r.keyword === 'nhập học')).toBeUndefined();
    });
  });

  describe('PHẦN 2: Từ viết tắt do workspace tự cấu hình', () => {
    it('11. Có thể khai báo cụm viết tắt riêng làm tiêu chí', () => {
      const customRules = [{ id: 'custom-hp', keyword: 'hp bn', weight: 3, group: 'custom', isActive: true }];
      const result = scoreConversation(['hp bn v'], customRules);
      expect(result.reasons.some((r) => r.keyword === 'hp bn')).toBe(true);
      expect(result.score).toBe(3);
    });

    it('12. Không tự chuyển viết tắt thành một tiêu chí chưa được cấu hình', () => {
      const result = scoreConversation(['em muon dk aptech'], standardRules);
      expect(result.reasons.some((r) => r.keyword === 'đăng ký')).toBe(false);
      expect(result.score).toBe(0);
    });

    it('13. Chuẩn hóa không tự mở rộng các từ viết tắt nghiệp vụ', () => {
      const result = scoreConversation(['ib sdt cho em'], standardRules);
      expect(result.entities.normalizedText).toBe('ib sdt cho em');
    });

    it('14. Tin không dấu chi phí: "khoa nay hoc phi bnhieu"', () => {
      const result = scoreConversation(['khoa nay hoc phi bnhieu'], standardRules);
      expect(result.reasons.some((r) => r.keyword === 'học phí')).toBe(true);
    });

    it('15. Có thể thêm alias theo cách trao đổi của từng workspace', () => {
      const customRules = [
        ...standardRules,
        { id: 'custom-hb', keyword: 'hb', weight: 3, group: 'documents', isActive: true },
      ];
      const result = scoreConversation(['em gui cccd va hb'], customRules);
      expect(result.reasons.some((r) => r.keyword === 'cccd')).toBe(true);
      expect(result.reasons.some((r) => r.keyword === 'hb')).toBe(true);
      expect(result.score).toBe(6);
    });

    it('16. Tin không dấu giữ chỗ: "em muon giu cho"', () => {
      const result = scoreConversation(['em muon giu cho'], standardRules);
      expect(result.reasons.some((r) => r.keyword === 'giữ chỗ')).toBe(true);
      expect(result.score).toBe(5);
    });

    it('17. Tin không dấu lịch học: "cho e xin lich hoc chi tiet"', () => {
      const result = scoreConversation(['cho e xin lich hoc chi tiet'], standardRules);
      expect(result.reasons.some((r) => r.keyword === 'lịch học')).toBe(true);
    });

    it('18. Alias tư vấn chỉ được áp dụng khi workspace thêm tiêu chí', () => {
      const customRules = [
        ...standardRules,
        { id: 'custom-tv', keyword: 'tv', weight: 2, group: 'custom', isActive: true },
      ];
      const result = scoreConversation(['ad tv cho e voi'], customRules);
      expect(result.reasons.some((r) => r.keyword === 'tv')).toBe(true);
      expect(result.score).toBe(2);
    });
  });

  describe('PHẦN 3: Cộng dồn Toàn bộ Hội thoại & Khử Trùng Lặp Luật', () => {
    it('19. Tiêu chí cộng dồn: Điểm được cộng dồn tích lũy qua nhiều tin nhắn', () => {
      const conversation = [
        'Học phí khóa này bao nhiêu ạ?', // +3 (học phí)
        'Lịch học các buổi tối trong tuần', // +3 (lịch học)
        'Em muốn đăng ký giữ chỗ', // +5 (đăng ký), +5 (giữ chỗ)
      ];
      const result = scoreConversation(conversation, standardRules);
      expect(result.score).toBe(16);
    });

    it('20. Tiêu chí khử lặp: Khách lặp lại "học phí" ở 3 tin nhắn khác nhau, chỉ tính +3 điểm một lần', () => {
      const conversation = [
        'Học phí bao nhiêu ạ?', // Khớp "học phí" (+3)
        'Học phí có được giảm không?', // Khớp "học phí" (Trùng -> Bỏ qua)
        'Em lo tiền học phí quá', // Khớp "học phí" (Trùng -> Bỏ qua)
      ];
      const result = scoreConversation(conversation, standardRules);
      const hpOccurrences = result.reasons.filter((r) => r.keyword === 'học phí');
      expect(hpOccurrences).toHaveLength(1);
      expect(result.score).toBe(3);
    });

    it('21. Khách lặp lại "đăng ký" nhiều lần chỉ tính đúng +5 điểm một lần', () => {
      const conversation = ['Em muốn đăng ký', 'Hướng dẫn em đăng ký với'];
      const result = scoreConversation(conversation, standardRules);
      const dkOccurrences = result.reasons.filter((r) => r.keyword === 'đăng ký');
      expect(dkOccurrences).toHaveLength(1);
      expect(result.score).toBe(5);
    });

    it('22. Kết hợp nhiều luật khác nhau qua các lượt tin nhắn trong hội thoại', () => {
      const conversation = [
        'Nhờ ad tư vấn', // +2 (tư vấn)
        'Học phí kỳ 1', // +3 (học phí)
        'Em chuẩn bị cccd rồi', // +3 (cccd)
      ];
      const result = scoreConversation(conversation, standardRules);
      expect(result.score).toBe(8);
      expect(result.tier).toBe('HOT');
    });

    it('23. Bỏ qua tin nhắn của tư vấn viên (STAFF), chỉ tính tin nhắn của khách hàng (CUSTOMER)', () => {
      const conversation: ConversationMessageInput[] = [
        { senderRole: 'CUSTOMER', content: 'Học phí bao nhiêu' }, // +3
        { senderRole: 'STAFF', content: 'Em đăng ký ngay hôm nay nhé' }, // Không tính
      ];
      const result = scoreConversation(conversation, standardRules);
      expect(result.reasons.find((r) => r.keyword === 'đăng ký')).toBeUndefined();
      expect(result.score).toBe(3);
    });
  });

  describe('PHẦN 4: Thưởng SĐT & Minh Bạch Lý Do Cho Sales (Explainability)', () => {
    it('24. Tiêu chí hoàn thành: Lead Nóng hiển thị được "học phí +3, đăng ký +5, có SĐT +5"', () => {
      const conversation = [
        'Học phí bao nhiêu ạ, em muốn đăng ký, SĐT của em là 0912345678',
      ];
      const result = scoreConversation(conversation, standardRules);

      expect(result.score).toBe(13); // 3 + 5 + 5
      expect(result.tier).toBe('HOT');
      expect(result.reasonsFormatted).toBe('học phí +3, đăng ký +5, có SĐT +5');
    });

    it('25. Thưởng SĐT chuẩn CUS-03 (+5 điểm): Khách gửi định dạng có dấu chấm', () => {
      const result = scoreConversation(['Sđt em 0912.345.678'], standardRules);
      expect(result.entities.phoneNumber).toBe('0912345678');
      expect(result.reasons.some((r) => r.keyword === 'có SĐT' && r.points === 5)).toBe(true);
      expect(result.score).toBe(5);
    });

    it('26. Thưởng SĐT mã quốc gia: +84 988 777 666 (+5 điểm)', () => {
      const result = scoreConversation(['Số zalo của em: +84 988 777 666'], standardRules);
      expect(result.entities.phoneNumber).toBe('0988777666');
      expect(result.reasons.some((r) => r.keyword === 'có SĐT')).toBe(true);
    });

    it('27. Không thưởng điểm nếu SĐT không hợp lệ hoặc thiếu số', () => {
      const result = scoreConversation(['Số điện thoại 09123'], standardRules);
      expect(result.entities.phoneNumber).toBeNull();
      expect(result.reasons.find((r) => r.keyword === 'có SĐT')).toBeUndefined();
    });

    it('28. Danh sách reasons chứa chi tiết điểm số của từng từ khóa phục vụ Sales kiểm chứng', () => {
      const result = scoreConversation(['Học phí, cccd, đăng ký, 0909123456'], standardRules);
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ keyword: 'học phí', points: 3 }),
          expect.objectContaining({ keyword: 'cccd', points: 3 }),
          expect.objectContaining({ keyword: 'đăng ký', points: 5 }),
          expect.objectContaining({ keyword: 'có SĐT', points: 5 }),
        ])
      );
      expect(result.score).toBe(16);
    });
  });

  describe('PHẦN 5: Phân Hạng Nhiệt Độ & Đổi Ngưỡng Động Không Deploy Lại', () => {
    it('29. Phân hạng Nóng: score >= 8 điểm -> HOT', () => {
      const result = scoreConversation(['học phí và đăng ký'], standardRules); // 3 + 5 = 8
      expect(result.score).toBe(8);
      expect(result.tier).toBe('HOT');
    });

    it('30. Phân hạng Ấm: score từ 4 đến 7 điểm -> WARM', () => {
      const result = scoreConversation(['em muốn đăng ký'], standardRules); // 5 điểm
      expect(result.score).toBe(5);
      expect(result.tier).toBe('WARM');
    });

    it('31. Phân hạng Lạnh: score từ 1 đến 3 điểm -> COLD', () => {
      const result = scoreConversation(['nhờ ad tư vấn'], standardRules); // 2 điểm
      expect(result.score).toBe(2);
      expect(result.tier).toBe('COLD');
    });

    it('32. Phân hạng Không liên quan: score = 0 -> IRRELEVANT', () => {
      const result = scoreConversation(['xin chào ad'], standardRules);
      expect(result.score).toBe(0);
      expect(result.tier).toBe('IRRELEVANT');
    });

    it('33. Tiêu chí hoàn thành: Đổi ngưỡng có hiệu lực ngay tại runtime mà không phải deploy lại', async () => {
      const mockRulesService = {
        getRules: async () => standardRules,
        getScoringConfig: async () => null,
        saveScoringConfig: async () => {},
      } as unknown as KeywordRulesService;

      const classificationService = new ConversationClassificationService(mockRulesService);

      const conversation = ['em muốn đăng ký khóa học']; // 5 điểm

      // Lần 1: Ngưỡng mặc định (Nóng >= 8, Ấm 4..7) -> Điểm 5 là WARM
      const res1 = await classificationService.classifyConversation({
        conversationId: 'conv-1',
        messages: conversation,
        workspaceId: 'ws-test',
      });
      expect(res1.score).toBe(5);
      expect(res1.tier).toBe('WARM');

      // Lần 2: Quản trị viên đổi ngưỡng Nóng xuống 5 điểm (không deploy lại)
      await classificationService.setThresholdConfig('ws-test', {
        hotMinScore: 5,
      });

      // Lần 3: Phân loại lại hội thoại, lập tức chuyển thành HOT
      const res2 = await classificationService.classifyConversation({
        conversationId: 'conv-1',
        messages: conversation,
        workspaceId: 'ws-test',
      });
      expect(res2.score).toBe(5);
      expect(res2.tier).toBe('HOT');
    });

    it('34. Nhóm LOẠI TRỪ (tuyển dụng, spam) luôn xếp vào IRRELEVANT dù có kèm từ khóa khác', () => {
      const conversation = ['Học phí bao nhiêu, bên mình có tuyển dụng không'];
      const result = scoreConversation(conversation, standardRules);
      expect(result.isExcluded).toBe(true);
      expect(result.tier).toBe('IRRELEVANT');
    });

    it('35. Tầng application: nạp luật có cache có hạn (TTL) và hỗ trợ xóa cache invalidate', async () => {
      let callCount = 0;
      const mockRulesService = {
        getRules: async () => {
          callCount++;
          return standardRules;
        },
        getScoringConfig: async () => null,
      } as unknown as KeywordRulesService;

      const classificationService = new ConversationClassificationService(mockRulesService);

      // Gọi lần 1: Nạp từ service (callCount = 1)
      const rules1 = await classificationService.getCachedRules('ws-cache-test');
      expect(rules1).toEqual(standardRules);
      expect(callCount).toBe(1);

      // Gọi lần 2: Đọc từ cache có hạn (callCount vẫn là 1)
      const rules2 = await classificationService.getCachedRules('ws-cache-test');
      expect(rules2).toEqual(standardRules);
      expect(callCount).toBe(1);

      // Invalidate cache: Lần gọi tiếp theo sẽ nạp lại từ service (callCount = 2)
      classificationService.invalidateCache('ws-cache-test');
      const rules3 = await classificationService.getCachedRules('ws-cache-test');
      expect(rules3).toEqual(standardRules);
      expect(callCount).toBe(2);
    });

    it('36. Tầng application: phát sự kiện ConversationClassified khi phân loại thành công', async () => {
      const mockRulesService = {
        getRules: async () => standardRules,
        getScoringConfig: async () => null,
      } as unknown as KeywordRulesService;

      const classificationService = new ConversationClassificationService(mockRulesService);
      const receivedEvents: any[] = [];

      classificationService.onClassified((event) => {
        receivedEvents.push(event);
      });

      await classificationService.classifyConversation({
        conversationId: 'conv-event-1',
        customerId: 'cust-1',
        workspaceId: 'ws-1',
        messages: ['em muốn đăng ký và học phí thế nào'],
      });

      expect(receivedEvents).toHaveLength(1);
      const ev = receivedEvents[0];
      expect(ev.conversationId).toBe('conv-event-1');
      expect(ev.customerId).toBe('cust-1');
      expect(ev.workspaceId).toBe('ws-1');
      expect(ev.result.tier).toBe('HOT');
      expect(ev.result.score).toBe(8); // 5 (đăng ký) + 3 (học phí)
      expect(ev.classifiedAt).toBeInstanceOf(Date);
    });

    it('37. Lead im lặng 14 ngày giảm dần độ quan tâm: Điểm 8 (HOT) trừ 3 điểm còn 5 điểm -> hạ xuống WARM', () => {
      // Khách nhắn có đăng ký (5đ) + học phí (3đ) = 8 điểm (đạt HOT)
      const messages = ['Em muốn đăng ký dịch vụ và hỏi học phí'];

      // Trường hợp 1: Mới nhắn hôm qua (daysInactive = 1) -> Giữ nguyên 8 điểm (HOT)
      const freshResult = scoreConversation(messages, standardRules, {}, [], 1);
      expect(freshResult.score).toBe(8);
      expect(freshResult.tier).toBe('HOT');

      // Trường hợp 2: Im lặng đúng 14 ngày -> Trừ 3 điểm còn 5 điểm -> Chuyển thành WARM
      const staleResult = scoreConversation(messages, standardRules, {}, [], 14);
      expect(staleResult.score).toBe(5);
      expect(staleResult.tier).toBe('WARM');
      expect(staleResult.reasonsFormatted).toContain('im lặng 14 ngày -3');

      // Trường hợp 3: Im lặng 21 ngày -> Trừ thêm bậc thang 5 điểm còn 3 điểm -> Chuyển thành COLD
      const veryStaleResult = scoreConversation(messages, standardRules, {}, [], 21);
      expect(veryStaleResult.score).toBe(3);
      expect(veryStaleResult.tier).toBe('COLD');
      expect(veryStaleResult.reasonsFormatted).toContain('im lặng 21 ngày -5');
    });

    it('38. Số ngày im lặng và mức điểm trừ cấu hình được linh hoạt theo Workspace', () => {
      const messages = ['Đăng ký tư vấn khóa học']; // 5 (đk) + 2 (tv) = 7 điểm (WARM)

      // Cấu hình workspace A: Im lặng 7 ngày đã bắt đầu trừ 4 điểm
      const customConfigA = {
        inactivityDecayDays: 7,
        inactivityDecayPoints: 4,
      };

      const res7Days = scoreConversation(messages, standardRules, customConfigA, [], 7);
      expect(res7Days.score).toBe(3); // 7 - 4 = 3 (COLD)
      expect(res7Days.tier).toBe('COLD');

      // Cấu hình workspace B: Im lặng 30 ngày mới trừ điểm
      const customConfigB = {
        inactivityDecayDays: 30,
        inactivityDecayPoints: 2,
      };

      const res14DaysWorkspaceB = scoreConversation(messages, standardRules, customConfigB, [], 14);
      expect(res14DaysWorkspaceB.score).toBe(7); // Chưa đến 30 ngày -> giữ nguyên 7 điểm
      expect(res14DaysWorkspaceB.tier).toBe('WARM');
    });

    it('39. Từ khóa nghiệp vụ chỉ được phân loại khi workspace tự khai báo', async () => {
      const mockRulesService = {
        getRules: async () => standardRules,
        getScoringConfig: async () => null,
      } as unknown as KeywordRulesService;

      const classificationService = new ConversationClassificationService(mockRulesService);

      const res = await classificationService.classifyConversation({
        conversationId: 'conv-ambiguous-1',
        messages: ['Cho em hỏi thủ tục thế nào'],
      });

      expect(res.tier).toBe('IRRELEVANT');

      const customRulesService = {
        getRules: async () => [
          ...standardRules,
          { id: 'custom-procedure', group: 'custom', keyword: 'thủ tục', weight: 4, isActive: true },
        ],
        getScoringConfig: async () => null,
      } as unknown as KeywordRulesService;
      const customService = new ConversationClassificationService(customRulesService);
      const customResult = await customService.classifyConversation({
        conversationId: 'conv-ambiguous-custom',
        messages: ['Cho em hỏi thủ tục thế nào'],
      });

      expect(customResult.tier).toBe('WARM');
      expect(customResult.score).toBe(4);
    });
  });
});

