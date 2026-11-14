import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { WorkspaceRole } from '../../contracts/roles.js';
import { getRequestIdentity, requireWorkspaceId } from '../../common/auth/request-identity.js';
import { ReportsService, OverviewFilterDto } from './reports.service.js';

@Controller('reports')
@UseGuards(WorkspaceRolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  async getOverview(
    @Req() request: any,
    @Query('workspaceId') queryWsId?: string,
    @Query('timeRange') timeRange?: OverviewFilterDto['timeRange'],
    @Query('channel') channel?: string,
    @Query('staffId') staffId?: string,
    @Query('courseId') courseId?: string,
    @Query('productId') productId?: string,
  ) {
    const workspaceId = requireWorkspaceId(request);
    const { role, userId } = getRequestIdentity(request);
    const isStaff = role === WorkspaceRole.STAFF;

    return this.reportsService.getOverview({
      workspaceId,
      currentStaffId: userId,
      timeRange,
      channel,
      // STAFF chỉ được xem báo cáo hiệu suất của chính mình, cấm xem người khác hoặc toàn workspace
      staffId: isStaff ? userId : staffId,
      courseId: courseId || productId,
      isStaffOnly: isStaff,
      callerRole: role,
    });
  }
}
