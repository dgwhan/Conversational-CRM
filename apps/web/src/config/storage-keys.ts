export const STORAGE_KEYS = {
  AUTH_SESSION: import.meta.env.VITE_AUTH_SESSION_KEY as string,
  ACTIVE_WORKSPACE: import.meta.env.VITE_ACTIVE_WORKSPACE_KEY as string,
  USER_ROLE: import.meta.env.VITE_USER_ROLE_KEY as string,
  WORKSPACE_CONFIG: import.meta.env.VITE_WORKSPACE_CONFIG_KEY as string,
} as const;

export type StorageKeyName = keyof typeof STORAGE_KEYS;

