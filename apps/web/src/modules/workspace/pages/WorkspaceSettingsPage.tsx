import React, { useState } from 'react';
import { useWorkspaceConfig } from '../WorkspaceConfigContext.js';
import type { BusinessDomain, WorkingHoursConfig, WorkspaceTerminology } from '../workspaceConfig.types.js';
import { useTranslation } from '../../../i18n/index.js';
import { Tabs, type TabItem } from '../../../components/ui/index.js';
import {
  WorkspaceSettingsHeader,
  StagesTab,
  CatalogTab,
  TerminologyTab,
  CriteriaTab,
  AlertsTab,
  WorkingHoursTab,
  MessageStorageTab,
  LeadScoringTab,
} from '../components/settings/index.js';

type SettingsTabId = 'stages' | 'catalog' | 'terminology' | 'criteria' | 'workingHours' | 'alerts' | 'storage' | 'leadScoring';

export const WorkspaceSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    config,
    isLoading,
    updateConfig,
    applyPreset,
    resetToDefault,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    addProduct,
    deleteProduct,
    addCriteria,
    deleteCriteria,
    activeWorkspace,
    isCurrentWorkspaceOwner,
  } = useWorkspaceConfig();

  const [activeTab, setActiveTab] = useState<SettingsTabId>('stages');

  const tabItems: TabItem<SettingsTabId>[] = [
    {
      id: 'stages',
      label: t('workspaceSettings.tabs.stages', 'Giai đoạn phễu'),
      count: config.pipelineStages?.length || 0,
    },
    {
      id: 'catalog',
      label: config.terminology?.productLabel || t('workspaceSettings.tabs.catalog', 'Sản phẩm & Dịch vụ'),
      count: config.productCatalog?.length || 0,
    },
    {
      id: 'terminology',
      label: t('workspaceSettings.tabs.terminology', 'Thuật ngữ hệ thống'),
    },
    {
      id: 'criteria',
      label: t('workspaceSettings.tabs.criteria', 'Tiêu chí phân loại'),
      count: config.criteria?.length || 0,
    },
    {
      id: 'workingHours',
      label: t('workspaceSettings.tabs.workingHours', 'Giờ làm việc & Tự động trả lời'),
    },
    {
      id: 'alerts',
      label: t('workspaceSettings.tabs.alerts', 'Cảnh báo phản hồi'),
    },
    {
      id: 'storage',
      label: t('workspaceSettings.tabs.storage', 'Lưu trữ & Dọn dẹp tin nhắn'),
    },
    {
      id: 'leadScoring',
      label: 'Chấm điểm Lead',
    },
  ];

  const handleSaveTerminology = async (terminology: WorkspaceTerminology) => {
    await updateConfig({ terminology });
  };

  const handleSaveWorkingHours = async (workingHours: WorkingHoursConfig) => {
    await updateConfig({ workingHours });
  };

  const handleSaveAlerts = async (unresponsiveAlertMinutes: number) => {
    await updateConfig({ unresponsiveAlertMinutes });
  };

  return (
    <div className="p-3 sm:p-4 max-w-[1600px] mx-auto min-h-full space-y-3.5 sm:space-y-4">
      {/* 1. Header Không Gian Làm Việc Đồng Bộ */}
      <WorkspaceSettingsHeader
        workspaceName={config.workspaceName || activeWorkspace?.name || 'Không Gian Làm Việc'}
        domain={config.domain || 'EDUCATION'}
        activeWorkspace={activeWorkspace}
        isOwner={isCurrentWorkspaceOwner}
        isLoading={isLoading}
        onApplyPreset={(domain: BusinessDomain) => applyPreset(domain)}
        onResetDefault={resetToDefault}
      />

      {/* 2. Thanh Chuyển Tab Chuẩn Hệ Thống */}
      <Tabs<SettingsTabId>
        items={tabItems}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 3. Nội Dung Tab Chi Tiết */}
      {activeTab === 'stages' && (
        <StagesTab
          stages={config.pipelineStages || []}
          isOwner={isCurrentWorkspaceOwner}
          isLoading={isLoading}
          onAddStage={addStage}
          onUpdateStage={updateStage}
          onDeleteStage={deleteStage}
          onReorderStages={reorderStages}
        />
      )}

      {activeTab === 'catalog' && (
        <CatalogTab
          catalog={config.productCatalog || []}
          productLabel={config.terminology?.productLabel}
          isOwner={isCurrentWorkspaceOwner}
          isLoading={isLoading}
          onAddProduct={addProduct}
          onDeleteProduct={deleteProduct}
        />
      )}

      {activeTab === 'terminology' && (
        <TerminologyTab
          terminology={config.terminology}
          isOwner={isCurrentWorkspaceOwner}
          isLoading={isLoading}
          onSave={handleSaveTerminology}
        />
      )}

      {activeTab === 'criteria' && (
        <CriteriaTab
          criteria={config.criteria || []}
          isOwner={isCurrentWorkspaceOwner}
          isLoading={isLoading}
          onAddCriteria={addCriteria}
          onDeleteCriteria={deleteCriteria}
        />
      )}

      {activeTab === 'workingHours' && (
        <WorkingHoursTab
          workingHours={config.workingHours}
          isOwner={isCurrentWorkspaceOwner}
          isLoading={isLoading}
          onSave={handleSaveWorkingHours}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsTab
          unresponsiveAlertMinutes={config.unresponsiveAlertMinutes}
          isOwner={isCurrentWorkspaceOwner}
          isLoading={isLoading}
          onSave={handleSaveAlerts}
        />
      )}

      {activeTab === 'storage' && (
        <MessageStorageTab
          workspaceId={config.workspaceId || activeWorkspace?.id}
          isOwner={isCurrentWorkspaceOwner}
        />
      )}

      {activeTab === 'leadScoring' && (
        <LeadScoringTab isOwner={isCurrentWorkspaceOwner} />
      )}
    </div>
  );
};
