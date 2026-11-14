import { ForbiddenException } from '@nestjs/common';
import { WorkspaceRole } from '../../../../contracts/roles.js';
import { DEAL_SYSTEM_MESSAGES } from '../constants/deal.constants.js';

export class DealAccessPolicy {
    /**
     * Kiểm tra cơ hội (Deal) có thuộc quyền phụ trách của nhân viên hay không.
     * Nhân viên STAFF được truy cập nếu:
     * - Được phân công trực tiếp vào Deal (assignedMember.userId === userId)
     * - Hoặc là nhân viên phụ trách khách hàng (channelIdentities.assignedStaffId / assignedMemberId)
     * - Hoặc là người phụ trách bất kỳ cuộc hội thoại nào của khách hàng
     */
    static isDealAssignedToStaff(deal: any, userId: string): boolean {
        if (!deal || !userId) return false;
        if (deal.assignedMember?.userId === userId) return true;
        const customer = deal.customer;
        if (customer) {
            const identities = (customer.channelIdentities as any) || {};
            if (identities.assignedStaffId === userId || identities.assignedMemberId === userId) {
                return true;
            }
            if (Array.isArray(customer.conversations)) {
                for (const conv of customer.conversations) {
                    if (
                        conv.assignedMember?.userId === userId ||
                        conv.assignedMemberId === userId ||
                        conv.assignedMember?.id === userId
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Xác thực quyền cập nhật của nhân viên STAFF.
     * STAFF không được tự ý phân công Deal cho người khác.
     */
    static validateStaffUpdatePermissions(
        callerRole: string | undefined,
        dto: { assignedMemberId?: any; assignedStaffName?: any },
    ): void {
        if (callerRole === WorkspaceRole.STAFF) {
            if (dto.assignedMemberId !== undefined || dto.assignedStaffName !== undefined) {
                throw new ForbiddenException(DEAL_SYSTEM_MESSAGES.CANNOT_REASSIGN_STAFF);
            }
        }
    }

    /**
     * Xác thực quyền xóa Deal.
     * STAFF không được tự ý xóa cơ hội.
     */
    static validateStaffDeletePermissions(callerRole: string | undefined): void {
        if (callerRole === WorkspaceRole.STAFF) {
            throw new ForbiddenException(DEAL_SYSTEM_MESSAGES.CANNOT_DELETE_DEAL);
        }
    }
}
