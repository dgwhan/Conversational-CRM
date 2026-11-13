import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../../platform/database/prisma.service.js";
import { AuditService } from "../../../audit/audit.service.js";
import { ShiftInput, ShiftMemberInput } from "../types/shift.types.js";
import { AuditAction, Prisma, WorkspaceMemberStatus } from "@prisma/client";
import { AUDIT_META } from "../constants/lead-routing.constants.js";
import { LeadQueueService } from "./lead-queue.service.js";
import { LeadRoutingSupportService } from "./lead-routing-support.service.js";

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ShiftManagementService{

    
    private readonly logger = new Logger(ShiftManagementService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly support: LeadRoutingSupportService,
        private readonly queue: LeadQueueService,
      ) { }

    async listShifts(workspaceId: string) {
        return this.prisma.workShift.findMany({
          where: { workspaceId },
          orderBy: [
            { isActive: 'desc' }, 
            { startTime: 'asc' }, 
            { name: 'asc' }
        ],
          include: {
            members: {
              include: {
                workspaceMember: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        fullName: true,
                        email: true,
                        status: true,
                      },
                    },
                  },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      }
    
      async createShift(
        workspaceId: string, 
        actorId: string, 
        input: ShiftInput
    ) {
        if (!input || typeof input !== 'object')
          throw new BadRequestException('Cấu hình ca không hợp lệ.');
        
        this.support.validateShift(input);
        const shift = await this.prisma.$transaction(async (tx) => {
          const shift = await tx.workShift.create({
            data: {
              workspaceId,
              name: input.name.trim(),
              startTime: input.startTime,
              endTime: input.endTime,
              timezone: input.timezone,
              weekdays: input.weekdays,
              isActive: input.isActive ?? true,
            },
          });
          await this.audit.recordBusinessEvent(tx, {
            action: AuditAction.SHIFT_CREATED,
            workspaceId,
            actorId,
            metadata: {
              shiftId: shift.id,
              before: null,
              after: shift,
              reason: 'OWNER_CREATED_SHIFT',
            },
          });
          return shift;
        });
        await this.queue.processWaitingQueue(workspaceId);
        return shift;
      }
    
      async updateShift(
        workspaceId: string,
        actorId: string,
        shiftId: string,
        patch: Partial<ShiftInput>,
      ) {
        if (!patch || typeof patch !== 'object')
          throw new BadRequestException('Thông tin cập nhật ca không hợp lệ.');
        if (patch.isActive !== undefined && typeof patch.isActive !== 'boolean')
          throw new BadRequestException('Trạng thái ca không hợp lệ.');
        const current = await this.prisma.workShift.findFirst({
          where: { id: shiftId, workspaceId },
        });
        if (!current) throw new NotFoundException('Không tìm thấy ca làm.');
        if (
          patch.name !== undefined ||
          patch.startTime !== undefined ||
          patch.endTime !== undefined ||
          patch.weekdays !== undefined ||
          patch.timezone !== undefined
        ) {
          this.support.validateShift({
            name: patch.name ?? current.name,
            startTime: patch.startTime ?? current.startTime,
            endTime: patch.endTime ?? current.endTime,
            timezone: patch.timezone ?? current.timezone,
            weekdays: patch.weekdays ?? current.weekdays,
          });
        }
        const updated = await this.prisma.$transaction(async (tx) => {
          const result = await tx.workShift.update({
            where: { id: shiftId },
            data: {
              ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
              ...(patch.startTime !== undefined
                ? { startTime: patch.startTime }
                : {}),
              ...(patch.endTime !== undefined ? { endTime: patch.endTime } : {}),
              ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
              ...(patch.weekdays !== undefined ? { weekdays: patch.weekdays } : {}),
              ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
            },
          });
          await this.audit.recordBusinessEvent(tx, {
            action:
              patch.isActive === false
                ? AuditAction.SHIFT_DEACTIVATED
                : AuditAction.SHIFT_UPDATED,
            workspaceId,
            actorId,
            metadata: {
              shiftId: shiftId,
              ...AUDIT_META(current, result, 'OWNER_UPDATED_SHIFT'),
            },
          });
          return result;
        });
        await this.queue.processWaitingQueue(workspaceId);
        return updated;
      }
    
      async deleteUnusedShift(
        workspaceId: string,
        actorId: string,
        shiftId: string,
      ) {
        const shift = await this.prisma.workShift.findFirst({
          where: { id: shiftId, workspaceId },
        });
        if (!shift) throw new NotFoundException('Không tìm thấy ca làm.');
        if (shift.usedAt)
          throw new ConflictException('Ca đã được sử dụng; chỉ có thể tắt ca.');
        await this.prisma.$transaction(async (tx) => {
          await tx.workShift.delete({ where: { id: shiftId } });
          await this.audit.recordBusinessEvent(tx, {
            action: AuditAction.SHIFT_DELETED,
            workspaceId,
            actorId,
            metadata: {
              shiftId: shift.id,
              before: shift,
              after: null,
              reason: 'UNUSED_SHIFT_DELETED',
            },
          });
        });
        return { success: true };
      }
    
      async replaceShiftMembers(
        workspaceId: string,
        actorId: string,
        shiftId: string,
        members: ShiftMemberInput[],
      ) {
        if (!Array.isArray(members))
          throw new BadRequestException(
            'Danh sách nhân viên trong ca không hợp lệ.',
          );
        const shift = await this.prisma.workShift.findFirst({
          where: { id: shiftId, workspaceId },
        });
        if (!shift) throw new NotFoundException('Không tìm thấy ca làm.');
        for (const entry of members) {
          if (
            !Number.isInteger(entry.leadCapacity) ||
            entry.leadCapacity < 0 ||
            entry.leadCapacity > 10000
          ) {
            throw new BadRequestException(
              'Hạn mức phải là số nguyên từ 0 đến 10000.',
            );
          }
        }
        const memberIds = [
          ...new Set(members.map((entry) => entry.workspaceMemberId)),
        ];
        if (memberIds.length !== members.length)
          throw new BadRequestException(
            'Một nhân viên chỉ được thêm một lần trong mỗi ca.',
          );
        const valid = await this.prisma.workspaceMember.findMany({
          where: {
            id: { in: memberIds },
            workspaceId,
            isActive: true,
            status: WorkspaceMemberStatus.ACTIVE,
          },
          select: { id: true },
        });
        if (valid.length !== memberIds.length)
          throw new BadRequestException(
            'Danh sách có thành viên không hoạt động trong workspace.',
          );
    
        const updated = await this.prisma.$transaction(async (tx) => {
          const before = await tx.workShiftMember.findMany({ where: { shiftId } });
          await tx.workShiftMember.deleteMany({ where: { shiftId } });
          const after = members.length
            ? await tx.workShiftMember.createMany({
              data: members.map((entry) => ({
                shiftId,
                workspaceMemberId: entry.workspaceMemberId,
                leadCapacity: entry.leadCapacity,
                isShiftManager: entry.isShiftManager ?? false,
              })),
            })
            : { count: 0 };
          await this.audit.recordBusinessEvent(tx, {
            action: AuditAction.SHIFT_MEMBER_UPDATED,
            workspaceId,
            actorId,
            metadata: {
              shiftId,
              shiftName: shift.name,
              before,
              after: members,
              reason: 'OWNER_REPLACED_SHIFT_MEMBERS',
              affectedCount: after.count,
            },
          });
          return tx.workShiftMember.findMany({
            where: { shiftId },
            include: { workspaceMember: { include: { user: true } } },
          });
        });
        await this.queue.processWaitingQueue(workspaceId);
        return updated;
      }
}