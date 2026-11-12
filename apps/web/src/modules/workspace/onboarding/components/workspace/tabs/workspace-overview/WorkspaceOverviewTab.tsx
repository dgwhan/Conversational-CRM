import React from "react";
import { WorkspaceDangerZone } from "./WorkspaceDangerZone.js";
import { WorkspaceInfoSection } from "./WorkspaceInfoSection.js";
import { WorkspaceMetricsSection } from "./WorkspaceMetricsSection.js";
import type { WorkspaceOverviewTabProps } from "./types.js";

export const WorkspaceOverviewTab: React.FC<WorkspaceOverviewTabProps> = ({
  workspace,
  domainLabel,
  membersCount,
  channelsCount,
  contactsCount,
  isLoadingContacts,
  adminName,
  canManageWorkspace = workspace.isOwner,
  onEditWorkspace,
  onSaveWorkspaceName,
  onDeleteWorkspace,
}) => (
  <div className="space-y-4 pt-1">
    <WorkspaceMetricsSection
      membersCount={membersCount}
      channelsCount={channelsCount}
      contactsCount={contactsCount}
      isLoadingContacts={isLoadingContacts}
    />
    <WorkspaceInfoSection
      workspace={workspace}
      domainLabel={domainLabel}
      adminName={adminName}
      canManageWorkspace={canManageWorkspace}
      onEditWorkspace={onEditWorkspace}
      onSaveWorkspaceName={onSaveWorkspaceName}
    />
    {workspace.isOwner && onDeleteWorkspace && (
      <WorkspaceDangerZone onDeleteWorkspace={onDeleteWorkspace} />
    )}
  </div>
);
