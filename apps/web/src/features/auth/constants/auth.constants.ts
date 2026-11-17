// Account authentication has no role. Workspace member roles live under modules/workspace/types.

export const AUTH_TAB = {
  LOGIN: 'login',
  SIGN_UP: 'signup',
} as const;

export type AuthTab = (typeof AUTH_TAB)[keyof typeof AUTH_TAB];
