import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../types.js';
import type { KeywordRuleItem, LeadScoringSettings } from '../../../lib/api-client/keyword-rules.js';
import { evaluateConversationScore } from './leadScoringUtils.js';

describe('evaluateConversationScore', () => {
  it('handles missing negation lists in older workspace settings', () => {
    const message: ChatMessage = {
      id: 'message-1',
      conversationId: 'conversation-1',
      direction: 'INBOUND',
      content: 'I am interested',
      sentAt: new Date().toISOString(),
      senderName: 'Customer',
    };
    const rules: KeywordRuleItem[] = [
      { id: 'interest', group: 'custom', keyword: 'interested', weight: 5, isActive: true },
    ];
    const settings: LeadScoringSettings = {
      hotMinScore: 10,
      warmMinScore: 7,
      coldMinScore: 1,
      phoneBonusScore: 0,
      inactivityDecayDays: 99,
      inactivityDecayPoints: 0,
      inactivityDecayWeeklyPoints: 0,
      inactivityDecayIntervalDays: 7,
      exclusionThresholdWeight: -50,
      exclusionPenaltyScore: -100,
      ambiguityScoreGap: 0,
      hotBoundaryMinMessages: 2,
      shortMessageMaxWords: 4,
      ambiguityResolutionEnabled: false,
      negationWindowWords: 2,
      negationTerms: [],
      negationPostTerms: [],
      tierLabels: { HOT: 'Hot', WARM: 'Warm', COLD: 'Cold', IRRELEVANT: 'Irrelevant' },
      tierRecommendations: { HOT: '', WARM: '', COLD: '', IRRELEVANT: '' },
    };
    Object.assign(settings, { negationTerms: undefined, negationPostTerms: undefined });

    expect(evaluateConversationScore([message], undefined, rules, settings)).toMatchObject({
      score: 5,
      tier: 'COLD',
    });
  });
});
