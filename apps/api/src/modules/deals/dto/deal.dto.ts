import { z } from 'zod';

/** Chuỗi tùy chọn có giới hạn độ dài; "" được coi như không gửi. */
const optionalText = (max: number) =>
    z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(max).optional());
/** Số tùy chọn; chấp nhận chuỗi số từ form, null/"" được coi như không gửi. */
const optionalNumber = z.preprocess(
    (v) => (v === null || v === '' ? undefined : v),
    z.coerce.number().finite().min(0).optional(),
);
const optionalDate = z.union([z.string(), z.date()]).nullish();

const dealFields = {
    customerId: optionalText(64),
    customerName: optionalText(255),
    customerPhone: optionalText(50),
    customerEmail: optionalText(255),
    stage: optionalText(50),
    pipelineId: optionalText(64),
    intake: optionalText(100),
    courses: z.array(z.string().max(255)).max(50).optional(),
    expectedRevenue: optionalNumber,
    actualRevenue: optionalNumber,
    priority: optionalText(50),
    status: optionalText(50),
    lostReason: optionalText(250),
    expectedCloseDate: optionalDate,
    actualCloseDate: optionalDate,
    assignedMemberId: z.string().max(64).nullish(),
    assignedStaffName: z.string().max(200).nullish(),
    notes: optionalText(10_000),
    metadata: z.record(z.string(), z.any()).optional(),
};

/** Body tạo Deal. Trường lạ bị loại bỏ; workspaceId luôn lấy từ request đã xác minh. */
export const createDealSchema = z.object({
    ...dealFields,
    contactId: optionalText(64),
    title: z.string().trim().min(1, 'Tên cơ hội là bắt buộc').max(250),
});

/** Body cập nhật Deal. */
export const updateDealSchema = z.object({
    ...dealFields,
    title: optionalText(250),
});

export type CreateDealDto = z.infer<typeof createDealSchema> & { workspaceId: string };
export type UpdateDealDto = z.infer<typeof updateDealSchema> & { updatedBy?: string };

export interface DealFilterDto {
    workspaceId?: string;
    customerId?: string;
    contactId?: string;
    stage?: string;
    status?: string;
    intake?: string;
    search?: string;
    page?: number | string;
    limit?: number | string;
}
