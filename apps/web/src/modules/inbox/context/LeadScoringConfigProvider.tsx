import React, { useCallback, useEffect, useRef, useState } from 'react';
import { notify } from '../../../components/feedback/toastEmitter.js';
import { apiClient } from '../../../lib/api-client/index.js';
import { useWorkspaceConfig } from '../../workspace/WorkspaceConfigContext.js';
import { LeadScoringConfigContext, type LeadScoringConfigValue } from './leadScoringConfig.js';

export const LeadScoringConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeWorkspaceId } = useWorkspaceConfig();
  const [config, setConfig] = useState<Omit<LeadScoringConfigValue, 'reload'>>({
    rules: [],
    settings: null,
    isLoading: true,
  });
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    if (!activeWorkspaceId) {
      setConfig((current) => ({ ...current, rules: [], settings: null, isLoading: false }));
      return true;
    }

    setConfig((current) => ({ ...current, isLoading: true }));

    try {
      const [rules, settings] = await Promise.all([
        apiClient.getKeywordRules(),
        apiClient.getLeadScoringSettings(),
      ]);
      const normalizedSettings = {
        ...settings,
        negationTerms: Array.isArray(settings.negationTerms)
          ? settings.negationTerms.filter((term) => typeof term === 'string')
          : [],
        negationPostTerms: Array.isArray(settings.negationPostTerms)
          ? settings.negationPostTerms.filter((term) => typeof term === 'string')
          : [],
      };
      setConfig((current) =>
        currentRequestId === requestId.current
          ? { ...current, rules, settings: normalizedSettings, isLoading: false }
          : current,
      );
      return currentRequestId === requestId.current;
    } catch (error: unknown) {
      if (currentRequestId !== requestId.current) return false;
      const message = error instanceof Error ? error.message : 'Không thể tải cấu hình chấm điểm Lead.';
      setConfig((current) => ({ ...current, rules: [], settings: null, isLoading: false }));
      notify.error(message, 'Lỗi cấu hình chấm điểm Lead');
      return false;
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <LeadScoringConfigContext.Provider value={{ ...config, reload }}>
      {children}
    </LeadScoringConfigContext.Provider>
  );
};
