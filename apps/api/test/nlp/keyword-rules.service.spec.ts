import { describe, expect, it } from 'vitest';
import { KeywordRulesService } from '../../src/modules/nlp/keyword-rules.service.js';
import { DEFAULT_SCORING_THRESHOLDS } from '../../src/modules/nlp/domain/conversation-scoring.js';

describe('KeywordRulesService', () => {
  it('starts without hardcoded rules and keeps custom rules scoped to their workspace', async () => {
    const service = new KeywordRulesService();

    expect(await service.getRules('workspace-1')).toEqual([]);

    await service.createRule({
      workspaceId: 'workspace-1',
      group: 'custom group',
      keyword: 'C++',
      weight: 9,
      isActive: true,
    });

    expect(await service.getRules('workspace-1')).toHaveLength(1);
    expect(await service.getRules('workspace-2')).toEqual([]);
    expect(await service.evaluateMessage('Learn C++', 'workspace-1')).toMatchObject({
      totalScore: 9,
      isExcluded: false,
    });
  });

  it('persists scoring settings per workspace when using the in-memory service', async () => {
    const service = new KeywordRulesService();
    const customSettings = {
      ...DEFAULT_SCORING_THRESHOLDS,
      hotMinScore: 20,
      negationTerms: ['not interested'],
    };

    await service.saveScoringConfig('workspace-1', customSettings);

    expect(await service.getScoringConfig('workspace-1')).toEqual(customSettings);
    expect(await service.getScoringConfig('workspace-2')).toBeNull();
  });
});
