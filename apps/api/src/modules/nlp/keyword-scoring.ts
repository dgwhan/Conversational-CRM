import { containsNormalizedPhrase, normalize } from './text-normalizer.js';
import { isKeywordNegated } from './domain/negation-detector.js';

export type KeywordRuleGroup = string;

export interface KeywordRuleItem {
  id: string;
  workspaceId?: string;
  group: KeywordRuleGroup;
  keyword: string;
  weight: number;
  isActive: boolean;
  description?: string;
}

export interface KeywordEvaluationResult {
  totalScore: number;
  matchedRules: Array<{
    ruleId: string;
    keyword: string;
    group: string;
    weight: number;
  }>;
  matchedGroups: string[];
  isExcluded: boolean;
  normalizedText: string;
}

export function evaluateKeywordRules(
  rawText: string,
  rules: KeywordRuleItem[] = [],
  exclusionThresholdWeight?: number,
  negationTerms: string[] = [],
  negationPostTerms: string[] = [],
  negationWindowWords = 0,
): KeywordEvaluationResult {
  const normalizedText = normalize(rawText);
  let totalScore = 0;
  const matchedRules: KeywordEvaluationResult['matchedRules'] = [];
  const groupsSet = new Set<string>();
  let isExcluded = false;
  const appliedKeywords = new Set<string>();

  for (const rule of rules) {
    if (!rule.isActive) continue;

    const normKeyword = normalize(rule.keyword);
    if (!normKeyword || appliedKeywords.has(normKeyword)) continue;

    if (!containsNormalizedPhrase(normalizedText, normKeyword)) continue;
    if (isKeywordNegated(normalizedText, normKeyword, negationWindowWords, negationTerms, negationPostTerms)) {
      continue;
    }

    appliedKeywords.add(normKeyword);
    totalScore += rule.weight;
    matchedRules.push({
      ruleId: rule.id,
      keyword: rule.keyword,
      group: rule.group,
      weight: rule.weight,
    });
    groupsSet.add(rule.group);

    if (
      typeof exclusionThresholdWeight === 'number'
        ? rule.weight <= exclusionThresholdWeight
        : rule.weight < 0
    ) {
      isExcluded = true;
    }
  }

  return {
    totalScore,
    matchedRules,
    matchedGroups: Array.from(groupsSet),
    isExcluded,
    normalizedText,
  };
}
