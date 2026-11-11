import { createContext, useContext } from 'react';
import type { KeywordRuleItem, LeadScoringSettings } from '../../../lib/api-client/keyword-rules.js';

export interface LeadScoringConfigValue {
  rules: KeywordRuleItem[];
  settings: LeadScoringSettings | null;
  isLoading: boolean;
  reload: () => Promise<boolean>;
}

export const LeadScoringConfigContext = createContext<LeadScoringConfigValue | null>(null);

export function useLeadScoringConfig(): LeadScoringConfigValue {
  const context = useContext(LeadScoringConfigContext);
  if (!context) {
    throw new Error('useLeadScoringConfig must be used within LeadScoringConfigProvider');
  }
  return context;
}
