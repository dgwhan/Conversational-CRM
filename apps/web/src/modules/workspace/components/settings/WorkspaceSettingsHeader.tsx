import React, { useState } from 'react';
import {
  RotateCcw,
  Sparkles,
  Building2,
  Shield,
  Check,
  ChevronDown,
} from 'lucide-react';
import type { BusinessDomain, WorkspaceItem } from '../../workspaceConfig.types.js';
import { CLIENT_INDUSTRY_PRESETS } from '../../workspacePresets.js';
import { getDomainLabel } from '../../workspaceConfig.types.js';

import { useTranslation } from '../../../../i18n/index.js';
export interface WorkspaceSettingsHeaderProps {
  workspaceName: string;
  domain: BusinessDomain | string;
  activeWorkspace: WorkspaceItem | null;
  isOwner: boolean;
  canManageWorkspace?: boolean;
  isLoading?: boolean;
  onApplyPreset: (domain: BusinessDomain) => void;
  onResetDefault: () => void;
}

export const WorkspaceSettingsHeader: React.FC<WorkspaceSettingsHeaderProps> = ({
  workspaceName,
  domain,
  activeWorkspace,
  isOwner,
  canManageWorkspace = isOwner,
  isLoading = false,
  onApplyPreset,
  onResetDefault,
}) => {
  const { t } = useTranslation();
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);

  const presetEntries = Object.entries(CLIENT_INDUSTRY_PRESETS) as [BusinessDomain, typeof CLIENT_INDUSTRY_PRESETS[BusinessDomain]][];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 m-0 break-words">
            {workspaceName || activeWorkspace?.name || t('workspaceSettings.defaultWorkspaceName', 'Không Gian Làm Việc')}
          </h1>
          {activeWorkspace?.slug && (
            <span className="text-xs text-slate-400 font-mono">
              @{activeWorkspace.slug}
            </span>
          )}
          <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-md inline-flex items-center gap-1">
            <Building2 size={11} />
            {getDomainLabel(domain)}
          </span>
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border inline-flex items-center gap-1 ${
              isOwner
                ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Shield size={11} />
            {isOwner ? t('workspaceSettings.owner', 'Chủ sở hữu') : canManageWorkspace ? 'Quản lý workspace' : t('workspaceSettings.member', 'Thành viên')}
          </span>
        </div>
        <p className="text-xs text-slate-500 m-0 mt-0.5 leading-relaxed">
          {t('workspaceSettings.headerDesc', 'Tùy biến quy trình kinh doanh, giai đoạn phễu, danh mục sản phẩm, thuật ngữ và giờ làm việc.')}
        </p>
      </div>

      {canManageWorkspace && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Preset Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPresetMenuOpen(!isPresetMenuOpen)}
              disabled={isLoading}
              className="h-8 px-3 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>{t('workspaceSettings.applyIndustryTemplate', 'Áp dụng mẫu ngành')}</span>
              <ChevronDown size={12} className="text-slate-400" />
            </button>

            {isPresetMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsPresetMenuOpen(false)}
                />
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-56 max-w-[calc(100vw-24px)] bg-white rounded-xl border border-slate-200/90 shadow-lg py-1 z-30 divide-y divide-slate-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('workspaceSettings.chooseIndustry', 'Chọn ngành nghề mẫu')}
                  </div>
                  <div className="py-1">
                    {presetEntries.map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setIsPresetMenuOpen(false);
                          onApplyPreset(key);
                        }}
                        className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <span className="font-medium">{preset.workspaceName}</span>
                        {domain === key && <Check size={13} className="text-blue-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={onResetDefault}
            disabled={isLoading}
            title={t('workspaceSettings.resetTooltip', 'Khôi phục về cấu hình CRM tiêu chuẩn')}
            className="h-8 px-2.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-600 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">{t('workspaceSettings.resetDefault', 'Khôi phục gốc')}</span>
          </button>
        </div>
      )}
    </div>
  );
};

