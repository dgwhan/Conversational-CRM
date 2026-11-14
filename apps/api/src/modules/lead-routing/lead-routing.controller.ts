import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { getRequestIdentity, requireWorkspaceId } from '../../common/auth/request-identity.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { WorkspaceRolesGuard } from '../../common/guards/workspace-roles.guard.js';
import { WorkspaceRole } from '../../contracts/roles.js';
import { WorkspacePermission, WorkspacePermissions } from '../../common/decorators/workspace-permissions.decorator.js';
import { LeadRoutingService } from './application/coordinator/lead-routing.service.js';

/**
 * Controller tiếp nhận các API điều phối ca trực, hàng chờ và bàn giao lead trong workspace
 */
@Controller('workspaces/current')
@UseGuards(WorkspaceRolesGuard)
export class LeadRoutingController {
  constructor(private readonly routing: LeadRoutingService) {}

  @Get('shifts')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  listShifts(@Req() req: unknown) {
    return this.routing.listShifts(requireWorkspaceId(req));
  }

  @Post('shifts')
  @WorkspacePermissions(WorkspacePermission.MANAGE_SHIFTS)
  createShift(@Req() req: unknown, @Body() body: any) {
    const identity = getRequestIdentity(req);
    return this.routing.createShift(requireWorkspaceId(req), identity.userId!, body);
  }

  @Patch('shifts/:shiftId')
  @WorkspacePermissions(WorkspacePermission.MANAGE_SHIFTS)
  updateShift(@Req() req: unknown, @Param('shiftId') shiftId: string, @Body() body: any) {
    const identity = getRequestIdentity(req);
    return this.routing.updateShift(requireWorkspaceId(req), identity.userId!, shiftId, body);
  }

  @Delete('shifts/:shiftId')
  @WorkspacePermissions(WorkspacePermission.MANAGE_SHIFTS)
  deleteShift(@Req() req: unknown, @Param('shiftId') shiftId: string) {
    const identity = getRequestIdentity(req);
    return this.routing.deleteUnusedShift(requireWorkspaceId(req), identity.userId!, shiftId);
  }

  @Put('shifts/:shiftId/members')
  @WorkspacePermissions(WorkspacePermission.MANAGE_SHIFTS)
  replaceMembers(@Req() req: unknown, @Param('shiftId') shiftId: string, @Body() body: { members?: any[] }) {
    const identity = getRequestIdentity(req);
    return this.routing.replaceShiftMembers(requireWorkspaceId(req), identity.userId!, shiftId, body.members ?? []);
  }

  @Get('staff-roster')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  roster(@Req() req: unknown) {
    return this.routing.getRoster(requireWorkspaceId(req));
  }

  @Post('shifts/:shiftId/members/:memberId/unexpected-leave')
  @WorkspacePermissions(WorkspacePermission.MANAGE_ROUTING)
  recordUnexpectedLeave(
    @Req() req: unknown,
    @Param('shiftId') shiftId: string,
    @Param('memberId') memberId: string,
    @Body() body: { mode?: 'QUEUE' | 'TRANSFER'; assigneeId?: string; note?: string },
  ) {
    const identity = getRequestIdentity(req);
    return this.routing.setUnexpectedLeave(
      requireWorkspaceId(req), identity.userId!, shiftId, memberId,
      body.mode === 'TRANSFER' ? 'TRANSFER' : 'QUEUE', body.assigneeId, body.note,
    );
  }

  @Post('availability-exceptions/:exceptionId/end')
  @WorkspacePermissions(WorkspacePermission.MANAGE_ROUTING)
  endUnexpectedLeave(@Req() req: unknown, @Param('exceptionId') exceptionId: string) {
    const identity = getRequestIdentity(req);
    return this.routing.endUnexpectedLeave(requireWorkspaceId(req), identity.userId!, exceptionId);
  }

  @Patch('staff/:memberId/assignment-lock')
  @WorkspacePermissions(WorkspacePermission.MANAGE_ROUTING)
  setAssignmentLock(
    @Req() req: unknown,
    @Param('memberId') memberId: string,
    @Body() body: { locked: boolean; handoverMode?: 'QUEUE' | 'TRANSFER'; targetMemberId?: string },
  ) {
    const identity = getRequestIdentity(req);
    return this.routing.setAssignmentLock(requireWorkspaceId(req), identity.userId!, memberId, body.locked === true, body.handoverMode, body.targetMemberId);
  }

  @Post('shifts/:shiftId/overtime-consent')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  overtimeConsent(@Req() req: unknown, @Param('shiftId') shiftId: string, @Body() body: { startsAt: string; endsAt: string }) {
    const identity = getRequestIdentity(req);
    return this.routing.recordOvertimeConsent(
      requireWorkspaceId(req), identity.userId!, shiftId, new Date(body.startsAt), new Date(body.endsAt),
    );
  }

  @Get('lead-queue')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  listQueue(@Req() req: unknown) {
    const identity = getRequestIdentity(req);
    return this.routing.listQueue(requireWorkspaceId(req), identity.userId!);
  }

  @Post('lead-queue/:conversationId/claim')
  @Roles(WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.STAFF)
  claim(@Req() req: unknown, @Param('conversationId') conversationId: string) {
    const identity = getRequestIdentity(req);
    return this.routing.claimQueueEntry(requireWorkspaceId(req), identity.userId!, conversationId);
  }

  @Post('conversations/:conversationId/handover')
  @WorkspacePermissions(WorkspacePermission.MANAGE_ROUTING)
  handover(@Req() req: unknown, @Param('conversationId') conversationId: string, @Body() body: { targetMemberId?: string | null }) {
    const identity = getRequestIdentity(req);
    return this.routing.handover(requireWorkspaceId(req), identity.userId!, conversationId, body.targetMemberId);
  }

  @Post('staff/:memberId/offboard')
  @WorkspacePermissions(WorkspacePermission.MANAGE_STAFF)
  offboard(
    @Req() req: unknown,
    @Param('memberId') memberId: string,
    @Body() body: { mode?: 'QUEUE' | 'TRANSFER'; targetMemberId?: string },
  ) {
    const identity = getRequestIdentity(req);
    return this.routing.offboardMember(
      requireWorkspaceId(req), identity.userId!, memberId,
      body.mode === 'TRANSFER' ? 'TRANSFER' : 'QUEUE', body.targetMemberId,
    );
  }

  @Post('staff/:memberId/handover-open')
  @WorkspacePermissions(WorkspacePermission.MANAGE_ROUTING)
  handoverMemberOpen(
    @Req() req: unknown,
    @Param('memberId') memberId: string,
    @Body() body: { mode?: 'QUEUE' | 'TRANSFER'; targetMemberId?: string },
  ) {
    const identity = getRequestIdentity(req);
    return this.routing.handoverMemberOpenConversations(
      requireWorkspaceId(req), identity.userId!, memberId,
      body.mode === 'TRANSFER' ? 'TRANSFER' : 'QUEUE', body.targetMemberId,
    );
  }
}
