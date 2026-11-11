import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { getRequestIdentity, requireWorkspaceId } from '../../src/common/auth/request-identity.js';
import { WorkspaceRole } from '../../src/contracts/roles.js';

describe('request-identity', () => {
  it('chỉ tin user/workspace do guard gắn lên request, bỏ qua header của client', () => {
    const req = {
      headers: { 'x-user-role': 'OWNER', 'x-staff-id': 'attacker', 'x-workspace-id': 'other-ws' },
      user: { id: 'u1' },
      workspace: { id: 'ws-1', role: 'STAFF' },
    };
    expect(getRequestIdentity(req)).toEqual({ userId: 'u1', workspaceId: 'ws-1', role: WorkspaceRole.STAFF });
  });

  it('vai trò mặc định là STAFF (đặc quyền tối thiểu) khi không xác định được', () => {
    expect(getRequestIdentity({}).role).toBe(WorkspaceRole.STAFF);
    expect(getRequestIdentity(undefined).role).toBe(WorkspaceRole.STAFF);
    expect(getRequestIdentity({ workspace: { id: 'w', role: 'ADMIN' } }).role).toBe(WorkspaceRole.STAFF);
  });

  it('nhận OWNER khi workspace đã xác minh có role OWNER', () => {
    expect(getRequestIdentity({ workspace: { id: 'w', role: 'OWNER' } }).role).toBe(WorkspaceRole.OWNER);
  });

  it('requireWorkspaceId trả workspace đã xác minh hoặc ném 403', () => {
    expect(requireWorkspaceId({ workspace: { id: 'ws-1' } })).toBe('ws-1');
    expect(() => requireWorkspaceId({ headers: { 'x-workspace-id': 'ws-1' } })).toThrow(ForbiddenException);
    expect(() => requireWorkspaceId(undefined)).toThrow(ForbiddenException);
  });
});
