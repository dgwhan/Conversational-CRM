import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { OnboardingState } from '../types.js';
import { WorkspaceListPage } from './WorkspaceListPage.js';
import { WorkspaceDetailPage } from '../../pages/WorkspaceDetailPage.js';
import { WorkspaceWizardView } from '../components/workspace/WorkspaceWizardView.js';
import { useOnboardingWizard } from '../hooks/useOnboardingWizard.js';
import { ROUTES, buildRoute } from '../../../../config/routes.js';
import type { WorkspaceItem } from '../../WorkspaceConfigContext.js';

export interface OnboardingWizardPageProps {
  onComplete: (data: OnboardingState) => void;
  onSkipToInbox?: () => void;
}
/**
 * Trang điều phối Quản lý Không gian làm việc
 */
export const OnboardingWizardPage: React.FC<OnboardingWizardPageProps> = ({
  onComplete,
  onSkipToInbox,
}) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const wizard = useOnboardingWizard({
    onComplete,
    onSkipToInbox,
  });

  // Tự động mở chi tiết Workspace nếu có param :id trên URL
  useEffect(() => {
    if (id && id !== 'undefined' && wizard.myWorkspaces.length > 0) {
      const found = wizard.myWorkspaces.find((ws) => ws.id === id || ws.slug === id);
      if (found) {
        wizard.handleViewDetail(found);
      }
    }
  }, [id, wizard.myWorkspaces]);

  const handleOpenDetail = (ws: WorkspaceItem) => {
    wizard.handleViewDetail(ws);
    navigate(buildRoute.workspace(ws.slug || ws.id));
  };

  const handleBackToList = () => {
    wizard.handleBackToList();
    navigate(ROUTES.WORKSPACE_DEFAULT);
  };

  // =========================================================================
  // TRANG DANH SÁCH WORKSPACE (WorkspaceListPage)
  // =========================================================================
  if (wizard.viewMode === 'list') {
    return (
      <div className="w-full min-h-full">
        <WorkspaceListPage
          workspaces={wizard.myWorkspaces}
          activeWorkspaceId={wizard.activeWorkspaceId}
          isLoading={wizard.isConfigLoading}
          onSelectWorkspace={wizard.switchWorkspace}
          onViewDetail={handleOpenDetail}
          onConfigureWorkspace={wizard.handleConfigureWorkspace}
          onCreateNewWorkspace={wizard.handleCreateNewWorkspace}
        />
      </div>
    );
  }

  // =========================================================================
  // TRANG CHI TIẾT WORKSPACE & CÁC KÊNH (WorkspaceDetailPage)
  // =========================================================================
  if (wizard.viewMode === 'detail' && wizard.selectedDetailWorkspace) {
    return (
      <div className="w-full min-h-full">
        <WorkspaceDetailPage
          workspace={wizard.selectedDetailWorkspace}
          isActive={wizard.selectedDetailWorkspace.id === wizard.activeWorkspaceId}
          onBack={handleBackToList}
          onSelectWorkspace={wizard.handleSelectWorkspaceInDetail}
          onGoToInbox={wizard.handleGoToInboxFromDetail}
        />
      </div>
    );
  }

  // =========================================================================
  //  3 BƯỚC THIẾT LẬP TẠO MỚI 
  // =========================================================================
  return (
    <WorkspaceWizardView
      state={wizard.state}
      isCreatingNewWorkspace={wizard.isCreatingNewWorkspace}
      activeConfiguringWs={wizard.activeConfiguringWs}
      isCheckingChannels={wizard.isCheckingChannels}
      onBackToList={wizard.handleBackToList}
      onSkipToInbox={onSkipToInbox}
      onStepClick={wizard.handleStepClick}
      onStep1Next={wizard.handleStep1Next}
      onConnectChannel={wizard.handleConnectChannel}
      onTogglePage={wizard.handleTogglePage}
      onDisconnectPage={wizard.handleDisconnectPage}
      onNextToStep3={() => wizard.setState((prev) => ({ ...prev, step: 3 }))}
      onBackToStep1={() => wizard.setState((prev) => ({ ...prev, step: 1 }))}
      onBackToStep2={() => wizard.setState((prev) => ({ ...prev, step: 2 }))}
      onAddInvite={wizard.handleAddInvite}
      onRemoveInvite={wizard.handleRemoveInvite}
      onFinish={wizard.handleComplete}
    />
  );
};
