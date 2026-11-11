import { STORAGE_KEYS } from '../../../config/storage-keys.js';

export function getWorkspaceConfigStorageKey(userId: string, workspaceId: string): string {
  const baseKey = STORAGE_KEYS.WORKSPACE_CONFIG;
  if (!baseKey || !userId || !workspaceId) return '';
  return `${baseKey}_user_${encodeURIComponent(userId)}_ws_${encodeURIComponent(workspaceId)}`;
}
