import type { BaseApiClient } from './core.js';

export type KeywordRuleGroup = string;

export type ConversationTier = 'HOT' | 'WARM' | 'COLD' | 'IRRELEVANT';

export interface KeywordRuleItem {
  id: string;
  workspaceId?: string;
  group: KeywordRuleGroup | string;
  keyword: string;
  weight: number;
  isActive: boolean;
  description?: string;
}

export interface LeadScoringSettings {
  hotMinScore: number;
  warmMinScore: number;
  coldMinScore: number;
  phoneBonusScore: number;
  inactivityDecayDays: number;
  inactivityDecayPoints: number;
  inactivityDecayWeeklyPoints: number;
  inactivityDecayIntervalDays: number;
  exclusionThresholdWeight: number;
  exclusionPenaltyScore: number;
  ambiguityScoreGap: number;
  hotBoundaryMinMessages: number;
  shortMessageMaxWords: number;
  ambiguityResolutionEnabled: boolean;
  negationWindowWords: number;
  negationTerms: string[];
  negationPostTerms: string[];
  tierLabels: Record<ConversationTier, string>;
  tierRecommendations: Record<ConversationTier, string>;
}

export function createKeywordRulesApi(client: BaseApiClient) {
  return {
    getRules() {
      return client.get<KeywordRuleItem[]>('/keyword-rules');
    },

    createRule(data: Omit<KeywordRuleItem, 'id' | 'workspaceId'>) {
      return client.post<KeywordRuleItem>('/keyword-rules', data);
    },

    updateRule(id: string, patch: Partial<Omit<KeywordRuleItem, 'id' | 'workspaceId'>>) {
      return client.patch<KeywordRuleItem>(`/keyword-rules/${encodeURIComponent(id)}`, patch);
    },

    deleteRule(id: string) {
      return client.delete<{ success: boolean }>(`/keyword-rules/${encodeURIComponent(id)}`);
    },

    getScoringSettings() {
      return client.get<LeadScoringSettings>('/keyword-rules/thresholds');
    },

    updateScoringSettings(patch: Partial<LeadScoringSettings>) {
      return client.patch<LeadScoringSettings>('/keyword-rules/thresholds', patch);
    },
  };
}
