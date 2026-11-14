export class CreateDealDto {
    workspaceId!: string;
    customerId?: string;
    contactId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    assignedMemberId?: string;

    title!: string;
    stage?: string;
    pipelineId?: string;
    intake?: string; // Niên khóa: K2025, K2026-Đợt 1
    courses?: string[];
    expectedRevenue?: number;
    actualRevenue?: number;
    priority?: string;
    status?: string; // OPEN, WON, LOST
    lostReason?: string;
    expectedCloseDate?: string | Date;
    actualCloseDate?: string | Date;
    assignedStaffName?: string;
    notes?: string;
    metadata?: Record<string, any>;
}

export class UpdateDealDto {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    title?: string;
    stage?: string;
    pipelineId?: string;
    intake?: string;
    courses?: string[];
    expectedRevenue?: number;
    actualRevenue?: number;
    priority?: string;
    status?: string;
    lostReason?: string;
    expectedCloseDate?: string | Date | null;
    actualCloseDate?: string | Date | null;
    assignedMemberId?: string | null;
    assignedStaffName?: string | null;
    notes?: string;
    metadata?: Record<string, any>;
    updatedBy?: string;
}

export class DealFilterDto {
    workspaceId?: string;
    customerId?: string;
    contactId?: string;
    stage?: string;
    status?: string;
    intake?: string;
    search?: string;
    page?: number | string;
    limit?: number | string;
    callerRole?: string;
    callerUserId?: string;
}
