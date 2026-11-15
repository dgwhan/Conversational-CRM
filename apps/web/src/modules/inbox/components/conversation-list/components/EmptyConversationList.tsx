import React from 'react';
import { Inbox } from 'lucide-react';
import { useTranslation } from '../../../../../i18n/index.js';

export const EmptyConversationList: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
      <Inbox size={20} className="text-slate-300" />
      <p className="text-xs text-slate-500 font-medium m-0">{t('inbox.emptyList')}</p>
    </div>
  );
};