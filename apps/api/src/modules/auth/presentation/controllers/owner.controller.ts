import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../../../platform/database/prisma.service.js';
import { Roles } from '../decorators/roles.decorator.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { WorkspaceRole } from '../../../../contracts/roles.js';

@Controller()
export class OwnerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('owner-only')
  @Roles(WorkspaceRole.OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  getOwnerOnly(): { ok: true } {
    return { ok: true };
  }

  @Get('owner/audit-logs')
  @Roles(WorkspaceRole.OWNER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAuditLogs(@Req() req: { workspace?: { id?: string } }): Promise<any> {
    if (!req.workspace?.id) return [];
    return this.prisma.auditLog.findMany({
      where: { workspaceId: req.workspace.id },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });
  }

}
