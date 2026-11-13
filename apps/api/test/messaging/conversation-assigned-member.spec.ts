import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CustomerService } from '../../src/modules/messaging/application/customer.service.js';

describe('CustomerService - Conversation Assigned Member & Referential Integrity', () => {
    let service: CustomerService;
    let mockPrisma: any;

    const wsId = '11111111-1111-1111-1111-111111111111';
    const memberId = '22222222-2222-2222-2222-222222222222';
    const userId = '33333333-3333-3333-3333-333333333333';
    const convId = '44444444-4444-4444-4444-444444444444';
    const custId = '55555555-5555-5555-5555-555555555555';

    beforeEach(() => {
        mockPrisma = {
            workspaceMember: {
                findUnique: vi.fn(),
                findFirst: vi.fn(),
                create: vi.fn(),
            },
            user: {
                findUnique: vi.fn(),
            },
            conversation: {
                findUnique: vi.fn(),
                findFirst: vi.fn(),
                update: vi.fn(),
                updateMany: vi.fn(),
            },
            customer: {
                findUnique: vi.fn(),
                findFirst: vi.fn(),
                update: vi.fn(),
                create: vi.fn(),
            },
        };

        service = new CustomerService(mockPrisma);
    });

    describe('resolveWorkspaceMemberId (Đảm bảo tính toàn vẹn tham chiếu)', () => {
        it('trả về null nếu staffId rỗng hoặc unassigned', async () => {
            expect(await service.resolveWorkspaceMemberId(null, wsId)).toBeNull();
            expect(await service.resolveWorkspaceMemberId('', wsId)).toBeNull();
            expect(await service.resolveWorkspaceMemberId('unassigned', wsId)).toBeNull();
        });

        it('trả về null nếu staffId không phải cú pháp UUID hợp lệ', async () => {
            expect(await service.resolveWorkspaceMemberId('not-a-uuid', wsId)).toBeNull();
        });

        it('phân giải thành công nếu staffId là WorkspaceMember.id hoặc User.id của thành viên đang hoạt động', async () => {
            mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({ id: memberId });
            expect(await service.resolveWorkspaceMemberId(memberId, wsId)).toBe(memberId);
            expect(mockPrisma.workspaceMember.findFirst).toHaveBeenCalledWith({
                where: {
                    workspaceId: wsId,
                    isActive: true,
                    status: 'ACTIVE',
                    OR: [{ id: memberId }, { userId: memberId }],
                },
                select: { id: true },
            });

            mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({ id: memberId });
            expect(await service.resolveWorkspaceMemberId(userId, wsId)).toBe(memberId);
            expect(mockPrisma.workspaceMember.findFirst).toHaveBeenCalledWith({
                where: {
                    workspaceId: wsId,
                    isActive: true,
                    status: 'ACTIVE',
                    OR: [{ id: userId }, { userId: userId }],
                },
                select: { id: true },
            });
        });

        it('KHÔNG tự thêm người dùng vào workspace (phải đi qua luồng mời thành viên)', async () => {
            mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce(null);
            mockPrisma.user.findUnique.mockResolvedValueOnce({ id: userId });

            expect(await service.resolveWorkspaceMemberId(userId, wsId)).toBeNull();
            expect(mockPrisma.workspaceMember.create).not.toHaveBeenCalled();
        });

        it('trả về null nếu thiếu workspace (không phân giải xuyên tenant)', async () => {
            expect(await service.resolveWorkspaceMemberId(memberId, undefined)).toBeNull();
            expect(mockPrisma.workspaceMember.findFirst).not.toHaveBeenCalled();
        });
    });

    describe('assignConversation', () => {
        it('cập nhật assignedMemberId cho Conversation và channelIdentities cho Customer', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValueOnce({
                id: convId,
                workspaceId: wsId,
                customer: {
                    id: custId,
                    channelIdentities: {},
                },
            });
            mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({ id: memberId });
            mockPrisma.conversation.update.mockResolvedValueOnce({
                id: convId,
                assignedMemberId: memberId,
            });
            mockPrisma.customer.update.mockResolvedValueOnce({
                id: custId,
            });

            const res = await service.assignConversation(convId, memberId, 'Nguyễn Tư Vấn', wsId);

            expect(res.success).toBe(true);
            expect(res.assignedMemberId).toBe(memberId);
            expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
                where: { id: convId },
                data: { assignedMemberId: memberId },
            });
            expect(mockPrisma.customer.update).toHaveBeenCalledWith({
                where: { id: custId },
                data: {
                    channelIdentities: {
                        assignedStaffId: memberId,
                        assignedStaffName: 'Nguyễn Tư Vấn',
                        assignedMemberId: memberId,
                    },
                },
            });
        });

        it('cho phép hủy phân công (unassign) an toàn bằng cách gán null', async () => {
            mockPrisma.conversation.findUnique.mockResolvedValueOnce({
                id: convId,
                workspaceId: wsId,
                customer: {
                    id: custId,
                    channelIdentities: { assignedMemberId: memberId },
                },
            });
            mockPrisma.conversation.update.mockResolvedValueOnce({
                id: convId,
                assignedMemberId: null,
            });
            mockPrisma.customer.update.mockResolvedValueOnce({
                id: custId,
            });

            const res = await service.assignConversation(convId, null, null, wsId);

            expect(res.success).toBe(true);
            expect(res.assignedMemberId).toBeNull();
            expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
                where: { id: convId },
                data: { assignedMemberId: null },
            });
        });
    });

    describe('updateCustomer đồng bộ Conversation assignedMemberId', () => {
        it('khi cập nhật assignedStaffId, tự động đồng bộ assignedMemberId vào Conversation', async () => {
            mockPrisma.customer.findUnique.mockResolvedValueOnce({
                id: custId,
                workspaceId: wsId,
                channelIdentities: {},
                conversations: [{ id: convId }],
            });
            mockPrisma.workspaceMember.findFirst.mockResolvedValueOnce({ id: memberId });
            mockPrisma.customer.update.mockResolvedValueOnce({
                id: custId,
                fullName: 'Khách hàng A',
                channelIdentities: {
                    assignedStaffId: memberId,
                    assignedStaffName: 'Nhân viên B',
                    assignedMemberId: memberId,
                },
            });
            mockPrisma.conversation.update.mockResolvedValueOnce({
                id: convId,
                assignedMemberId: memberId,
            });

            const res = await service.updateCustomer(
                custId,
                {
                    assignedStaffId: memberId,
                    assignedStaffName: 'Nhân viên B',
                    conversationId: convId,
                },
                wsId,
            );

            expect(res.assignedStaffId).toBe(memberId);
            expect(res.assignedMemberId).toBe(memberId);
            expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
                where: { id: convId },
                data: { assignedMemberId: memberId },
            });
        });
    });
});
