import type { KeywordRuleItem } from '../../../../../../../lib/api-client/keyword-rules.js';

export type RuleDraft = Omit<KeywordRuleItem, 'id' | 'workspaceId'>;

export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface KeywordRulesManagerProps {
  rules: KeywordRuleItem[];
  isOwner: boolean;
  onReload: () => Promise<boolean>;
  onQuickAddGroupPrefill?: (groupName: string) => void;
}

export interface KeywordGroupSummary {
  groupName: string;
  rules: KeywordRuleItem[];
  activeCount: number;
  inactiveCount: number;
}

