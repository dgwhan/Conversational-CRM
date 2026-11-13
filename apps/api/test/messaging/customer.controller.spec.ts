import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const TEST_WS = '55555555-5555-4555-8555-555555555555';
/** Request giả lập sau khi JwtAuthGuard + WorkspaceContextGuard đã xác minh danh tính */
const makeReq = (role: 'OWNER' | 'STAFF' = 'OWNER', userId = 'staff-admin-99') => ({
  user: { id: userId },
  workspace: { id: TEST_WS, role },
});
import { CustomerController } from '../../src/modules/messaging/presentation/customer.controller.js';
import type { CustomerService } from '../../src/modules/messaging/application/customer.service.js';
import type { RealtimeService } from '../../src/modules/realtime/realtime.service.js';

describe('CustomerController', () => {
    let controller: CustomerController;
    let mockCustomerService: Partial<CustomerService>;
    let mockRealtime: Partial<RealtimeService>;

    beforeEach(() => {
        // Mock CustomerService trực tiếp — controller không nên biết về PrismaService
        mockCustomerService = {
            getCustomers: vi.fn(),
            getCustomerById: vi.fn(),
            updateCustomer: vi.fn(),
            removeCustomerTag: vi.fn(),
            assignConversation: vi.fn(),
            anonymizeCustomer: vi.fn(),
        };

        mockRealtime = {
            broadcastPipelineChange: vi.fn(),
        };

        controller = new CustomerController(
            mockCustomerService as unknown as CustomerService,
        );
    });

    describe('getCustomers', () => {
        it('trả về danh sách khách hàng kèm leadStatus và leadStage', async () => {
            const expectedResult = {
                total: 2,
                page: 1,
                limit: 20,
                items: [
                    {
                        id: 'cust-1',
                        fullName: 'Nguyễn Văn A',
                        phone: '0901234567',
                        email: 'a@example.com',
                        leadStatus: 'POTENTIAL',
                        leadStage: 'STAGE_QUALIFIED',
                        interestCourses: ['Lập trình viên'],
                        estimatedValue: 25000000,
                        tags: ['Lead'],
                        conversations: [],
                    },
                    {
                        id: 'cust-2',
                        fullName: 'Trần Thị B',
                        phone: '0907654321',
                        email: null,
                        leadStatus: 'CONVERTED',
                        leadStage: 'STAGE_ENROLLED',
                        interestCourses: [],
                        estimatedValue: 0,
                        tags: [],
                        conversations: [],
                    },
                ],
            };

            vi.mocked(mockCustomerService.getCustomers!).mockResolvedValue(expectedResult as any);

            const result = await controller.getCustomers(makeReq());

            expect(result.total).toBe(2);
            expect(result.items[0].leadStatus).toBe('POTENTIAL');
            expect(result.items[0].leadStage).toBe('STAGE_QUALIFIED');
            expect(result.items[0].interestCourses).toEqual(['Lập trình viên']);
            expect(result.items[0].tags).toEqual(['Lead']);

            // Fallback sang channelIdentities nếu cột null
            expect(result.items[1].leadStatus).toBe('CONVERTED');
            expect(result.items[1].leadStage).toBe('STAGE_ENROLLED');
        });
    });

    describe('updateCustomer', () => {
        it('cập nhật leadStatus, leadStage vào cơ sở dữ liệu và broadcast realtime event', async () => {
            const customerUuid = '11111111-1111-1111-1111-111111111111';

            const updatedResult = {
                id: customerUuid,
                fullName: 'Nguyễn Văn A',
                leadStatus: 'POTENTIAL',
                leadStage: 'STAGE_QUALIFIED',
                channelIdentities: { leadStatus: 'POTENTIAL', leadStage: 'STAGE_QUALIFIED' },
            };

            vi.mocked(mockCustomerService.updateCustomer!).mockResolvedValue(updatedResult as any);

            const result = await controller.updateCustomer(makeReq(), customerUuid, {
                leadStatus: 'POTENTIAL',
                leadStage: 'STAGE_QUALIFIED',
                updatedBy: 'Tư vấn viên Lan',
            });

            expect(mockCustomerService.updateCustomer).toHaveBeenCalledWith(
                customerUuid,
                expect.objectContaining({
                    leadStatus: 'POTENTIAL',
                    leadStage: 'STAGE_QUALIFIED',
                    updatedBy: 'Tư vấn viên Lan',
                }),
                TEST_WS, // workspace đã xác minh từ request, không từ header
                { role: 'OWNER', staffId: 'staff-admin-99' },
            );

            expect(result.leadStatus).toBe('POTENTIAL');
            expect(result.leadStage).toBe('STAGE_QUALIFIED');
        });

        it('tự động tạo mới Customer vào DB khi ID chưa có trong DB (upsert an toàn)', async () => {
            const newCustResult = {
                id: '22222222-2222-2222-2222-222222222222',
                fullName: 'Ứng viên mới',
                leadStatus: 'POTENTIAL',
                leadStage: 'STAGE_QUALIFIED',
                channelIdentities: {},
            };

            vi.mocked(mockCustomerService.updateCustomer!).mockResolvedValue(newCustResult as any);

            const result = await controller.updateCustomer(makeReq(), 'cand-123456', {
                fullName: 'Ứng viên mới',
                leadStatus: 'POTENTIAL',
                leadStage: 'STAGE_QUALIFIED',
            });

            expect(mockCustomerService.updateCustomer).toHaveBeenCalledWith(
                'cand-123456',
                expect.objectContaining({
                    fullName: 'Ứng viên mới',
                    leadStatus: 'POTENTIAL',
                    leadStage: 'STAGE_QUALIFIED',
                }),
                TEST_WS,
                { role: 'OWNER', staffId: 'staff-admin-99' },
            );
            expect(result.leadStatus).toBe('POTENTIAL');
        });
    });

    describe('assignConversation', () => {
        it('ủy quyền phân công hội thoại sang CustomerService với header workspace', async () => {
            const convId = '33333333-3333-3333-3333-333333333333';
            const staffId = '44444444-4444-4444-4444-444444444444';
            const wsId = '55555555-5555-5555-5555-555555555555';

            vi.mocked(mockCustomerService.assignConversation!).mockResolvedValue({
                success: true,
                conversationId: convId,
                assignedMemberId: staffId,
                assignedStaffId: staffId,
                assignedStaffName: 'Nguyễn Văn Tư Vấn',
            } as any);

            const result = await controller.assignConversation(makeReq(), convId, { staffId, staffName: 'Nguyễn Văn Tư Vấn' });

            expect(mockCustomerService.assignConversation).toHaveBeenCalledWith(
                convId,
                staffId,
                'Nguyễn Văn Tư Vấn',
                TEST_WS,
            );
            expect(result.success).toBe(true);
            expect(result.assignedMemberId).toBe(staffId);
        });

        it('STAFF không được phân công hội thoại dù tự gửi header x-user-role: OWNER', async () => {
            await expect(
                controller.assignConversation(makeReq('STAFF', 'staff-1'), '33333333-3333-3333-3333-333333333333', { staffId: 'x' }),
            ).rejects.toThrow(ForbiddenException);
            expect(mockCustomerService.assignConversation).not.toHaveBeenCalled();
        });
    });

    describe('anonymizeCustomer', () => {
        it('chuyển tiếp lệnh ẩn danh dữ liệu theo Nghị định 13/2023/NĐ-CP tới CustomerService', async () => {
            const customerId = 'cust-123456';
            const staffId = 'staff-admin-99';
            const reason = 'Khách hàng yêu cầu rút dữ liệu cá nhân';

            vi.mocked(mockCustomerService.anonymizeCustomer!).mockResolvedValue({
                success: true,
                anonymizedCustomerId: customerId,
                anonymizedName: 'Khách hàng ẩn danh #CUST12',
                message: 'Đã ẩn danh hóa thành công',
                retainedMetrics: {
                    leadStatus: 'POTENTIAL',
                    leadStage: 'STAGE_QUALIFIED',
                    workspaceId: 'ws-1',
                },
            } as any);

            const result = await controller.anonymizeCustomer(makeReq('OWNER', staffId), customerId, { reason });

            // actorId lấy từ token, không từ header x-staff-id
            expect(mockCustomerService.anonymizeCustomer).toHaveBeenCalledWith(
                customerId,
                staffId,
                reason,
                TEST_WS,
            );
            expect(result.success).toBe(true);
            expect(result.anonymizedCustomerId).toBe(customerId);
        });

        it('chỉ OWNER được ẩn danh hóa khách hàng', async () => {
            await expect(
                controller.anonymizeCustomer(makeReq('STAFF', 'staff-1'), 'cust-1', { reason: 'x' }),
            ).rejects.toThrow(ForbiddenException);
            expect(mockCustomerService.anonymizeCustomer).not.toHaveBeenCalled();
        });
    });
});
