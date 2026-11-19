import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZcaPersonalService } from '../../src/modules/channel-connection/application/zca-personal/zca-personal.service.js';
import { LeadAssignmentService } from '../../src/modules/lead-routing/application/assignment/lead-assignment.service.js';
import { ConversationStatus, LeadRoutingStatus } from '../../src/modules/lead-routing/application/constants/routing-status.constants.js';
import { LeadQueueReason } from '@prisma/client';
import {
  CustomerLeadStatus,
  CustomerLeadStage,
  DEFAULT_CRM_CONFIG,
} from '../../src/contracts/crm-status.constants.js';

/**
 * BỘ TEST KIỂM THỬ VÀ XÁC NHẬN CHỨC NĂNG PHÂN CA KHI NHẬN TIN NHẮN (ZALO PERSONAL LEAD ROUTING)
 *
 * Phối hợp giữa BA, DA và DEV:
 * 1. BA Verification: Kiểm tra logic nghiệp vụ phân bổ hội thoại vào ca trực, gán nhân viên tư vấn đang trực.
 * 2. DA Verification: Kiểm tra cấu hình tập trung CRM_CONFIG (leadStatus, status, leadStage).
 * 3. DEV Verification: Kiểm tra việc kích hoạt LeadRoutingService tự động trong ZcaPersonalService.
 */

describe('Lead Routing & Assignment Verification for Zalo Inbound Messages', () => {
  const workspaceId = 'ws-test-uuid-1111';
  const channelAccountId = 'channel-acc-zalo-personal-2222';
  const myZcaUid = '112233445566';
  const customerZaloId = '998877665544';
  const customerName = 'Trần Thị Bích Ngọc';
  const counselorMemberId = 'member-counselor-uuid-3333';

  describe('Phần 1: Xác nhận Fix ở ZcaPersonalService & Cấu hình tập trung', () => {
    it('Tin nhắn Zalo Personal đến tạo Customer & Conversation với cấu hình tập trung và TỰ ĐỘNG phân ca', async () => {
      let createdCustomerData: any = null;
      let createdConversationData: any = null;

      const mockLeadRouting = {
        routeNewConversation: vi.fn().mockResolvedValue({
          status: LeadRoutingStatus.ASSIGNED,
          assignedMemberId: counselorMemberId,
        }),
      };

      const mockPrisma: any = {
        channelAccount: {
          findFirst: vi.fn().mockResolvedValue({
            id: channelAccountId,
            workspaceId,
            channel: 'ZALO',
            externalAccountId: myZcaUid,
            displayName: 'Nick Zalo Tư Vấn Viên',
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        customer: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation(({ data }) => {
            createdCustomerData = data;
            return Promise.resolve({
              id: 'cust-uuid-5555',
              ...data,
            });
          }),
        },
        conversation: {
          findFirst: vi.fn().mockResolvedValue(null), // Hội thoại hoàn toàn mới
          create: vi.fn().mockImplementation(({ data }) => {
            createdConversationData = data;
            return Promise.resolve({
              id: 'conv-uuid-7777',
              ...data,
            });
          }),
          update: vi.fn().mockImplementation(({ data }) => {
            return Promise.resolve({ id: 'conv-uuid-7777', ...data });
          }),
        },
        message: {
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue({ id: 'msg-uuid-8888', attachments: [] }),
        },
      };

      const mockRealtime: any = {
        broadcastNewMessage: vi.fn(),
      };

      // Khởi tạo ZcaPersonalService với mockLeadRouting được truyền qua injectedLeadRoutingService
      const zcaService = new ZcaPersonalService(
        mockPrisma,
        mockRealtime,
        undefined,
        undefined,
        undefined,
        mockLeadRouting, // injectedLeadRoutingService
        undefined,
      );

      // Giả lập tin nhắn Zalo Personal từ khách hàng mới
      const incomingMessageEvent = {
        data: {
          msgId: 'zalo_msg_inbound_001',
          uidFrom: customerZaloId,
          idTo: myZcaUid,
          dName: customerName,
          content: 'Chào trung tâm, em muốn tìm hiểu chương trình tuyển sinh 2026',
          ts: Date.now(),
        },
        threadId: customerZaloId,
        isSelf: false,
      };

      await (zcaService as any).handleIncomingPersonalMessage(myZcaUid, incomingMessageEvent);

      // 1. Kiểm tra Customer được tạo với trạng thái từ file cấu hình tập trung
      expect(mockPrisma.customer.create).toHaveBeenCalled();
      expect(createdCustomerData.leadStatus).toBe(DEFAULT_CRM_CONFIG.DEFAULT_LEAD_STATUS);
      expect(createdCustomerData.leadStatus).toBe(CustomerLeadStatus.NEW);
      expect(createdCustomerData.leadStage).toBe(DEFAULT_CRM_CONFIG.DEFAULT_LEAD_STAGE);
      expect(createdCustomerData.leadStage).toBe(CustomerLeadStage.STAGE_NEW);

      // 2. Kiểm tra Conversation được tạo với trạng thái từ file cấu hình tập trung
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
      expect(createdConversationData.status).toBe(DEFAULT_CRM_CONFIG.DEFAULT_CONVERSATION_STATUS);
      expect(createdConversationData.status).toBe(ConversationStatus.OPEN);

      // 3. XÁC NHẬN CHỨC NĂNG PHÂN CA ĐÃ ĐƯỢC GỌI TỰ ĐỘNG:
      expect(mockLeadRouting.routeNewConversation).toHaveBeenCalledWith('conv-uuid-7777', workspaceId);
    });

    it('Không kích hoạt phân ca lại nếu cuộc trò chuyện đã có người phụ trách (assignedMemberId đã tồn tại)', async () => {
      const mockLeadRouting = {
        routeNewConversation: vi.fn().mockResolvedValue({}),
      };

      const mockPrisma: any = {
        channelAccount: {
          findFirst: vi.fn().mockResolvedValue({
            id: channelAccountId,
            workspaceId,
            channel: 'ZALO',
            externalAccountId: myZcaUid,
            displayName: 'Nick Zalo Tư Vấn Viên',
          }),
        },
        customer: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'cust-uuid-5555',
            workspaceId,
            fullName: customerName,
          }),
        },
        conversation: {
          // Cuộc trò chuyện đã tồn tại và đã gán cho tư vấn viên
          findFirst: vi.fn().mockResolvedValue({
            id: 'conv-uuid-existing',
            workspaceId,
            assignedMemberId: counselorMemberId,
            unreadCount: 0,
          }),
          update: vi.fn().mockResolvedValue({ id: 'conv-uuid-existing' }),
        },
        message: {
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue({ id: 'msg-uuid-9999', attachments: [] }),
        },
      };

      const zcaService = new ZcaPersonalService(
        mockPrisma,
        undefined,
        undefined,
        undefined,
        undefined,
        mockLeadRouting,
      );

      const incomingMessageEvent = {
        data: {
          msgId: 'zalo_msg_inbound_002',
          uidFrom: customerZaloId,
          idTo: myZcaUid,
          dName: customerName,
          content: 'Em vừa chuyển khoản học phí rồi ạ',
          ts: Date.now(),
        },
        threadId: customerZaloId,
        isSelf: false,
      };

      await (zcaService as any).handleIncomingPersonalMessage(myZcaUid, incomingMessageEvent);

      // Không gọi lại routeNewConversation vì cuộc trò chuyện đã có người phụ trách
      expect(mockLeadRouting.routeNewConversation).not.toHaveBeenCalled();
    });
  });

  describe('Phần 2: Xác nhận luồng chuẩn của LeadAssignmentService (Expected Shift Routing Flow)', () => {
    let mockPrisma: any;
    let mockAudit: any;
    let mockSupport: any;
    let mockShiftService: any;
    let mockQueueService: any;
    let mockRealtime: any;
    let assignmentService: LeadAssignmentService;

    beforeEach(() => {
      mockAudit = {
        recordBusinessEvent: vi.fn().mockResolvedValue(undefined),
      };

      mockShiftService = {
        markShiftMemberIdsUsed: vi.fn().mockResolvedValue(undefined),
      };

      mockQueueService = {
        queueWithinTransaction: vi.fn().mockResolvedValue({ created: true }),
        notifyQueue: vi.fn().mockResolvedValue(undefined),
      };

      mockRealtime = {
        emit: vi.fn(),
      };

      mockSupport = {
        getCandidates: vi.fn(),
        getOpenCounts: vi.fn(),
        shiftIsActive: vi.fn(),
      };
    });

    it('Kịch bản 1: Tư vấn viên đang trong ca trực và còn dung lượng (Capacity) -> Hội thoại được gán thành công (ASSIGNED)', async () => {
      const convId = 'conv-uuid-test-01';

      const mockTx: any = {
        conversation: {
          findFirst: vi.fn().mockResolvedValue({
            id: convId,
            workspaceId,
            status: ConversationStatus.OPEN,
            assignedMemberId: null,
            customerId: 'cust-uuid-01',
          }),
          update: vi.fn().mockResolvedValue({
            id: convId,
            workspaceId,
            customerId: 'cust-uuid-01',
            assignedMemberId: counselorMemberId,
          }),
        },
        customer: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'cust-uuid-01',
            channelIdentities: { zalo: customerZaloId },
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        workspaceMember: {
          findFirst: vi.fn().mockResolvedValue({
            id: counselorMemberId,
            userId: 'user-counselor-01',
            user: { fullName: 'Nguyễn Văn Tư Vấn' },
          }),
        },
        workShift: {
          findMany: vi.fn().mockResolvedValue([{ id: 'shift-1', isActive: true }]),
        },
        workShiftMember: {
          findFirst: vi.fn().mockResolvedValue({
            id: 'shift-member-1',
            lastAssignedAt: null,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        leadQueueEntry: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        $queryRaw: vi.fn().mockResolvedValue([{ id: counselorMemberId }]),
        $executeRaw: vi.fn().mockResolvedValue(1),
      };

      mockPrisma = {
        workShift: {
          count: vi.fn().mockResolvedValue(1),
        },
        $transaction: vi.fn(async (cb) => cb(mockTx)),
      };

      mockSupport.getCandidates.mockResolvedValue([
        {
          workspaceMemberId: counselorMemberId,
          userId: 'user-counselor-01',
          capacity: 10,
          lastAssignedAt: null,
          shiftMemberIds: ['shift-member-1'],
        },
      ]);

      const openCountsMap = new Map<string, number>();
      openCountsMap.set(counselorMemberId, 2); // 2/10 -> Còn 8 chỗ
      mockSupport.getOpenCounts.mockResolvedValue(openCountsMap);

      assignmentService = new LeadAssignmentService(
        mockPrisma,
        mockAudit,
        mockSupport,
        mockShiftService,
        mockQueueService,
        mockRealtime,
      );

      const result = await assignmentService.routeNewConversation(convId, workspaceId);

      expect(result.status).toBe(LeadRoutingStatus.ASSIGNED);
      if (result.status === LeadRoutingStatus.ASSIGNED) {
        expect(result.assignedMemberId).toBe(counselorMemberId);
      }

      expect(mockTx.conversation.update).toHaveBeenCalledWith({
        where: { id: convId },
        data: { assignedMemberId: counselorMemberId },
        select: { workspaceId: true, customerId: true },
      });

      expect(mockTx.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-uuid-01' },
        data: {
          channelIdentities: expect.objectContaining({
            assignedMemberId: counselorMemberId,
            assignedStaffId: 'user-counselor-01',
            assignedStaffName: 'Nguyễn Văn Tư Vấn',
          }),
        },
      });

      expect(mockRealtime.emit).toHaveBeenCalledWith(
        'conversation:assigned',
        { conversationId: convId, assignedMemberId: counselorMemberId },
        workspaceId,
      );
    });

    it('Kịch bản 2: Tất cả nhân viên trực ca đều đầy hạn mức (Over Capacity) -> Hội thoại được đẩy vào hàng chờ (QUEUED - NO_CAPACITY)', async () => {
      const convId = 'conv-uuid-test-02';

      const mockTx: any = {
        conversation: {
          findFirst: vi.fn().mockResolvedValue({
            id: convId,
            workspaceId,
            status: ConversationStatus.OPEN,
            assignedMemberId: null,
          }),
        },
        workShift: {
          findMany: vi.fn().mockResolvedValue([{ id: 'shift-1', isActive: true }]),
        },
      };

      mockPrisma = {
        workShift: {
          count: vi.fn().mockResolvedValue(1),
        },
        $transaction: vi.fn(async (cb) => cb(mockTx)),
      };

      mockSupport.getCandidates.mockResolvedValue([
        {
          workspaceMemberId: counselorMemberId,
          userId: 'user-counselor-01',
          capacity: 5,
          lastAssignedAt: new Date(),
          shiftMemberIds: ['shift-member-1'],
        },
      ]);

      const openCountsMap = new Map<string, number>();
      openCountsMap.set(counselorMemberId, 5); // 5/5 -> Hết chỗ
      mockSupport.getOpenCounts.mockResolvedValue(openCountsMap);
      mockSupport.shiftIsActive.mockReturnValue(true);

      assignmentService = new LeadAssignmentService(
        mockPrisma,
        mockAudit,
        mockSupport,
        mockShiftService,
        mockQueueService,
        mockRealtime,
      );

      const result = await assignmentService.routeNewConversation(convId, workspaceId);

      expect(result.status).toBe(LeadRoutingStatus.QUEUED);
      if (result.status === LeadRoutingStatus.QUEUED) {
        expect(result.reason).toBe(LeadQueueReason.NO_CAPACITY);
      }
      expect(mockQueueService.queueWithinTransaction).toHaveBeenCalledWith(
        mockTx,
        workspaceId,
        convId,
        LeadQueueReason.NO_CAPACITY,
      );
    });

    it('Kịch bản 3: Ngoài ca trực (Không có ca nào đang active) -> Hội thoại được đẩy vào hàng chờ (QUEUED - NO_ACTIVE_SHIFT)', async () => {
      const convId = 'conv-uuid-test-03';

      const mockTx: any = {
        conversation: {
          findFirst: vi.fn().mockResolvedValue({
            id: convId,
            workspaceId,
            status: ConversationStatus.OPEN,
            assignedMemberId: null,
          }),
        },
        workShift: {
          findMany: vi.fn().mockResolvedValue([{ id: 'shift-night', isActive: true }]),
        },
      };

      mockPrisma = {
        workShift: {
          count: vi.fn().mockResolvedValue(1),
        },
        $transaction: vi.fn(async (cb) => cb(mockTx)),
      };

      mockSupport.getCandidates.mockResolvedValue([]);
      mockSupport.getOpenCounts.mockResolvedValue(new Map());
      mockSupport.shiftIsActive.mockReturnValue(false);

      assignmentService = new LeadAssignmentService(
        mockPrisma,
        mockAudit,
        mockSupport,
        mockShiftService,
        mockQueueService,
        mockRealtime,
      );

      const result = await assignmentService.routeNewConversation(convId, workspaceId);

      expect(result.status).toBe(LeadRoutingStatus.QUEUED);
      if (result.status === LeadRoutingStatus.QUEUED) {
        expect(result.reason).toBe(LeadQueueReason.NO_ACTIVE_SHIFT);
      }
      expect(mockQueueService.queueWithinTransaction).toHaveBeenCalledWith(
        mockTx,
        workspaceId,
        convId,
        LeadQueueReason.NO_ACTIVE_SHIFT,
      );
    });
  });
});
