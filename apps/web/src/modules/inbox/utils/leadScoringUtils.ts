import type {
  ChatMessage,
  ConversationClassificationData,
  ConversationTier,
} from '../types.js';
import { removeVietnameseTones } from '../../../lib/unaccent.js';
import { standardizeVietnamesePhoneNumber } from '../../../lib/phone.js';
import type { KeywordRuleItem, LeadScoringSettings } from '../../../lib/api-client/keyword-rules.js';

function containsNormalizedPhrase(text: string, phrase: string): boolean {
  const isWordCharacter = (character: string | undefined) =>
    character !== undefined && /[\p{L}\p{N}_]/u.test(character);
  let index = text.indexOf(phrase);

  while (index !== -1) {
    const before = index > 0 ? text[index - 1] : undefined;
    const afterIndex = index + phrase.length;
    const after = afterIndex < text.length ? text[afterIndex] : undefined;
    if (!isWordCharacter(before) && !isWordCharacter(after)) return true;
    index = text.indexOf(phrase, index + 1);
  }

  return false;
}

/**
 * Kiểm tra xem từ khóa có bị phủ định trong câu hay không
 */
function isKeywordNegatedInText(
  normText: string,
  normKw: string,
  negationTerms: string[],
  negationPostTerms: string[],
  windowWords: number,
): boolean {
  if (!normText.includes(normKw)) return false;

  const clauses = normText.split(/[,.;!?\n]+/).map((c) => c.trim()).filter(Boolean);

  for (const clause of clauses) {
    if (!clause.includes(normKw)) continue;

    const words = clause.split(/\s+/);
    const kwTokens = normKw.split(/\s+/);
    const kwLen = kwTokens.length;

    for (let i = 0; i <= words.length - kwLen; i++) {
      if (words.slice(i, i + kwLen).join(' ') === normKw) {
        // Kiểm tra tiền từ (1 đến 4 từ đứng trước)
        const prefix = words.slice(Math.max(0, i - windowWords), i).join(' ');
        if (
          negationTerms.some((term) =>
            containsNormalizedPhrase(prefix, removeVietnameseTones(term).replace(/\s+/g, ' ').trim()),
          )
        ) return true;

        // Kiểm tra hậu từ (1 đến 2 từ đứng sau: "đâu", "nữa")
        const suffix = words.slice(i + kwLen, Math.min(words.length, i + kwLen + windowWords)).join(' ');
        if (
          negationPostTerms.some((term) =>
            containsNormalizedPhrase(suffix, removeVietnameseTones(term).replace(/\s+/g, ' ').trim()),
          )
        ) return true;
      }
    }
  }

  return false;
}

/**
 * Đánh giá điểm và phân loại hội thoại động DỰA TRÊN THÔNG TIN VÀ TIN NHẮN THỰC TẾ
 */
export function evaluateConversationScore(
  messages: ChatMessage[],
  customerPhone: string | undefined,
  rules: KeywordRuleItem[],
  settings: LeadScoringSettings,
): ConversationClassificationData {
  const matchedReasons: Array<{ keyword: string; points: number }> = [];
  const appliedRuleIds = new Set<string>();
  const appliedKeywords = new Set<string>();
  let isExcluded = false;
  const negationTerms = Array.isArray(settings.negationTerms)
    ? settings.negationTerms.filter((term) => typeof term === 'string')
    : [];
  const negationPostTerms = Array.isArray(settings.negationPostTerms)
    ? settings.negationPostTerms.filter((term) => typeof term === 'string')
    : [];

  // 1. Quét toàn bộ tin nhắn trao đổi trong hội thoại
  // Khách hàng là người gửi (INBOUND hoặc tin nhắn trò chuyện)
  for (const msg of messages) {
    const rawContent = msg.content || '';
    if (!rawContent.trim()) continue;

    // Chỉ tính tin nhắn của khách (INBOUND) để đánh giá ý định của thí sinh
    if (msg.direction === 'OUTBOUND') continue;

    const normContent = removeVietnameseTones(rawContent).replace(/\s+/g, ' ');

    for (const rule of rules) {
      const normKeyword = removeVietnameseTones(rule.keyword).replace(/\s+/g, ' ').trim();
      if (appliedRuleIds.has(rule.id) || appliedKeywords.has(normKeyword)) continue;

      if (!rule.isActive || !normKeyword || !containsNormalizedPhrase(normContent, normKeyword)) continue;

      if (isKeywordNegatedInText(
        normContent,
        normKeyword,
        negationTerms,
        negationPostTerms,
        settings.negationWindowWords,
      )) continue;

      appliedRuleIds.add(rule.id);
      appliedKeywords.add(normKeyword);
      matchedReasons.push({
        keyword: rule.keyword,
        points: rule.weight,
      });

      if (rule.weight <= settings.exclusionThresholdWeight) isExcluded = true;
    }
  }

  const inboundMessages = messages.filter((message) => message.direction !== 'OUTBOUND' && message.content?.trim());
  const lastInboundAt = inboundMessages.reduce((latest, message) => {
    const sentAt = Date.parse(message.sentAt);
    return Number.isFinite(sentAt) && sentAt > latest ? sentAt : latest;
  }, 0);
  const daysInactive = lastInboundAt > 0
    ? Math.max(0, Math.floor((Date.now() - lastInboundAt) / 86_400_000))
    : undefined;

  // 2. Kiểm tra xem có Số Điện Thoại hay không (từ thông tin khách hàng hoặc trong tin nhắn)
  let hasValidPhone = false;

  if (customerPhone && customerPhone !== 'Chưa có SĐT' && !customerPhone.includes('**')) {
    const std = standardizeVietnamesePhoneNumber(customerPhone);
    if (std) hasValidPhone = true;
  }

  if (!hasValidPhone) {
    for (const msg of messages) {
      if (msg.direction === 'OUTBOUND') continue;
      const phoneMatch = (msg.content || '').match(/(?:\+84|0)(?:[\s.\-–—]?[0-9]){9}\b/);
      if (phoneMatch) {
        const std = standardizeVietnamesePhoneNumber(phoneMatch[0]);
        if (std) {
          hasValidPhone = true;
          break;
        }
      }
    }
  }

  if (hasValidPhone) {
    matchedReasons.push({
      keyword: 'có SĐT',
      points: settings.phoneBonusScore,
    });
  }

  if (
    typeof daysInactive === 'number' &&
    daysInactive >= settings.inactivityDecayDays &&
    settings.inactivityDecayPoints > 0 &&
    !isExcluded
  ) {
    const extraIntervals = Math.floor(
      (daysInactive - settings.inactivityDecayDays) / settings.inactivityDecayIntervalDays,
    );
    matchedReasons.push({
      keyword: `im lặng ${daysInactive} ngày`,
      points: -(settings.inactivityDecayPoints + extraIntervals * settings.inactivityDecayWeeklyPoints),
    });
  }

  // 3. Tính tổng điểm
  let totalScore = 0;
  for (const r of matchedReasons) {
    totalScore += r.points;
  }

  if (!isExcluded && totalScore < 0) {
    totalScore = 0;
  } else if (isExcluded && totalScore > 0) {
    totalScore = settings.exclusionPenaltyScore;
  }

  // 4. Xác định Tier
  const isInactive = typeof daysInactive === 'number' && daysInactive >= settings.inactivityDecayDays;
  const shouldPromoteAtHotBoundary =
    !isExcluded &&
    !isInactive &&
    settings.ambiguityResolutionEnabled &&
    totalScore < settings.hotMinScore &&
    totalScore >= settings.hotMinScore - settings.ambiguityScoreGap &&
    inboundMessages.length >= settings.hotBoundaryMinMessages;
  if (shouldPromoteAtHotBoundary) totalScore = settings.hotMinScore;

  let tier: ConversationTier = 'IRRELEVANT';
  if (!isExcluded && totalScore >= settings.hotMinScore) tier = 'HOT';
  else if (!isExcluded && totalScore >= settings.warmMinScore) tier = 'WARM';
  else if (!isExcluded && totalScore >= settings.coldMinScore) tier = 'COLD';

  // 5. Chuỗi giải trình
  const reasonsFormatted =
    matchedReasons.length > 0
      ? matchedReasons.map((r) => `${r.keyword} ${r.points >= 0 ? `+${r.points}` : r.points}`).join(', ')
      : 'Chưa phát hiện từ khóa quan tâm';

  return {
    score: totalScore,
    tier,
    reasons: matchedReasons,
    reasonsFormatted,
  };
}

