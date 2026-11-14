import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/prisma.service.js';
import { RealtimeService } from '../../realtime/realtime.service.js';
import { ActivityService } from '../../activities/activity.service.js';
import { CreateDealDto, UpdateDealDto, DealFilterDto } from './dto/deal.dto.js';
import { CreateDealOperation } from './operations/create-deal.operation.js';
import { FindDealsOperation } from './operations/find-deals.operation.js';
import { UpdateDealOperation } from './operations/update-deal.operation.js';
import { DeleteDealOperation } from './operations/delete-deal.operation.js';
import { DealAccessPolicy } from '../domain/policies/deal-access.policy.js';

@Injectable()
export class DealService {
    private readonly findDealsOp: FindDealsOperation;
    private readonly createDealOp: CreateDealOperation;
    private readonly updateDealOp: UpdateDealOperation;
    private readonly deleteDealOp: DeleteDealOperation;

    constructor(
        private readonly prisma: PrismaService,
        @Optional() private readonly realtime?: RealtimeService,
        @Optional() private readonly activityService?: ActivityService,
        @Optional() findDealsOp?: FindDealsOperation,
        @Optional() createDealOp?: CreateDealOperation,
        @Optional() updateDealOp?: UpdateDealOperation,
        @Optional() deleteDealOp?: DeleteDealOperation,
    ) {
        this.findDealsOp = findDealsOp ?? new FindDealsOperation(this.prisma);
        this.createDealOp = createDealOp ?? new CreateDealOperation(this.prisma, this.realtime);
        this.updateDealOp =
            updateDealOp ??
            new UpdateDealOperation(this.prisma, this.findDealsOp, this.realtime, this.activityService);
        this.deleteDealOp =
            deleteDealOp ?? new DeleteDealOperation(this.prisma, this.findDealsOp, this.realtime);
    }

    /**
     * Tạo một cơ hội tuyển sinh / đợt đăng ký mới cho Học viên (Deal / Registration)
     */
    async create(dto: CreateDealDto): Promise<any> {
        return this.createDealOp.execute(dto);
    }

    /**
     * Lấy danh sách Deal / Cơ hội có phân trang và bộ lọc
     */
    async findAll(filter: DealFilterDto): Promise<any> {
        return this.findDealsOp.findAll(filter);
    }

    /**
     * Lấy lịch sử tất cả các Deals / Đợt đăng ký của một Khách hàng
     */
    async findDealsByCustomer(
        customerIdOrContactId: string,
        workspaceId?: string,
        caller?: { role?: string; userId?: string },
    ): Promise<any> {
        return this.findDealsOp.findDealsByCustomer(customerIdOrContactId, workspaceId, caller);
    }

    /**
     * Lấy chi tiết 1 Deal
     */
    async findById(
        id: string,
        workspaceId?: string,
        caller?: { role?: string; userId?: string },
    ): Promise<any> {
        return this.findDealsOp.findById(id, workspaceId, caller);
    }

    /**
     * Kiểm tra cơ hội tuyển sinh có thuộc quyền phụ trách của nhân viên hay không
     */
    isDealAssignedToStaff(deal: any, userId: string): boolean {
        return DealAccessPolicy.isDealAssignedToStaff(deal, userId);
    }

    /**
     * Cập nhật thông tin Deal / chuyển đổi giai đoạn phễu tuyển sinh
     */
    async update(
        id: string,
        dto: UpdateDealDto,
        workspaceId?: string,
        caller?: { role?: string; userId?: string },
    ): Promise<any> {
        return this.updateDealOp.execute(id, dto, workspaceId, caller);
    }

    /**
     * Xóa một Deal
     */
    async delete(
        id: string,
        workspaceId?: string,
        caller?: { role?: string; userId?: string },
    ): Promise<{ success: boolean; message: string }> {
        return this.deleteDealOp.execute(id, workspaceId, caller);
    }
}

