import { ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '../../contracts/roles.js';

export interface RequestIdentity {
  /** ID người dùng đã xác thực qua Access Token (không bao giờ lấy từ header client) */
  userId?: string;
  /** Workspace đã được kiểm tra tư cách thành viên */
  workspaceId?: string;
  /** Vai trò trong workspace. Mặc định STAFF (đặc quyền tối thiểu) khi không xác định được */
  role: WorkspaceRole;
}

/**
 * Đọc danh tính đáng tin cậy do JwtAuthGuard + WorkspaceContextGuard gắn lên request.
 * Tuyệt đối không đọc các header x-user-role / x-staff-id / x-owner-id từ client.
 */
export function getRequestIdentity(req: unknown): RequestIdentity {
  const r = (req ?? {}) as {
    user?: { id?: string };
    workspace?: { id?: string; role?: string };
  };
  return {
    userId: r.user?.id,
    workspaceId: r.workspace?.id,
    role:
      r.workspace?.role === WorkspaceRole.OWNER
        ? WorkspaceRole.OWNER
        : r.workspace?.role === WorkspaceRole.MANAGER
          ? WorkspaceRole.MANAGER
          : WorkspaceRole.STAFF,
  };
}

/**
 * Lấy workspaceId đã được xác minh tư cách thành viên; ném 403 nếu request không thuộc workspace nào.
 * Dùng cho mọi endpoint thao tác dữ liệu theo tenant để KHÔNG phải tin workspaceId do client gửi.
 */
export function requireWorkspaceId(req: unknown): string {
  const { workspaceId } = getRequestIdentity(req);
  if (!workspaceId) {
    throw new ForbiddenException('Không xác định được workspace của người dùng.');
  }
  return workspaceId;
}
