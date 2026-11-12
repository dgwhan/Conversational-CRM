import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { requireWorkspaceId } from '../../common/auth/request-identity.js';
import {
  WorkspacePermission,
  WorkspacePermissions,
} from '../../common/decorators/workspace-permissions.decorator.js';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard.js';
import { AuditService } from './audit.service.js';

@Controller('workspaces/current/audit')
@UseGuards(WorkspaceRolesGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @WorkspacePermissions(WorkspacePermission.MANAGE_WORKSPACE)
  getWorkspaceAudit(
    @Req() req: unknown,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
    @Query('shiftId') shiftId?: string,
    @Query('startAt') startAt?: string,
    @Query('endAt') endAt?: string,
  ) {
    return this.audit.getWorkspaceAuditLogs(
      requireWorkspaceId(req),
      Number(take) || 50,
      cursor,
      shiftId,
      startAt,
      endAt,
    );
  }
}
