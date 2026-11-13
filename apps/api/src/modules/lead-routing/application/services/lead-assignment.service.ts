import { Injectable, Logger, Optional } from "@nestjs/common";
import { WorkspaceRole } from "../../../workspace-config/index.js";
import { PrismaService } from "../../../../platform/database/prisma.service.js";
import { AuditService } from "../../../audit/audit.service.js";
import { RealtimeService } from "../../../realtime/realtime.service.js";

@Injectable()
export class LeadAssignmentService {
private readonly logger = new Logger(LeadAssignmentService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        @Optional() private readonly realtime?: RealtimeService,
      ) { }

  async hasWorkspaceManagementPermission(
    workspaceId: string,
    userId: string,
  ): Promise<boolean> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });

    if (!member) {
      return false;
    }

    return (
      member.role === WorkspaceRole.OWNER ||
      member.role === WorkspaceRole.MANAGER
    );
  }
}