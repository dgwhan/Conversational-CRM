import type { WorkspaceItem } from "../../../../../WorkspaceConfigContext.js";

export interface WorkspaceOverviewTabProps {
  workspace: WorkspaceItem;
  domainLabel: string;
  membersCount: number;
  channelsCount: number;
  contactsCount: number | null;
  isLoadingContacts: boolean;
  adminName: string;
  canManageWorkspace?: boolean;
  onEditWorkspace?: () => void;
  onSaveWorkspaceName?: (newName: string) => Promise<void>;
  onDeleteWorkspace?: () => void;
}

export interface WorkspaceMetricsSectionProps {
  membersCount: number;
  channelsCount: number;
  contactsCount: number | null;
  isLoadingContacts: boolean;
}

export interface WorkspaceInfoSectionProps {
  workspace: WorkspaceItem;
  domainLabel: string;
  adminName: string;
  canManageWorkspace: boolean;
  onEditWorkspace?: () => void;
  onSaveWorkspaceName?: (newName: string) => Promise<void>;
}

export interface WorkspaceDangerZoneProps {
  onDeleteWorkspace: () => void;
}
