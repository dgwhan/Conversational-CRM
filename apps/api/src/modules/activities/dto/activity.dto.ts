import { z } from 'zod';

export enum ActivityTypeEnum {
    CALL = 'CALL',
    MEETING = 'MEETING',
    TASK = 'TASK',
    NOTE = 'NOTE',
    SYSTEM = 'SYSTEM',
}

export enum ActivityStatusEnum {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum ActivityPriorityEnum {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

/** Chuỗi tùy chọn có giới hạn độ dài; "" được coi như không gửi. */
const optionalText = (max: number) =>
    z.preprocess((v) => (v === '' ? undefined : v), z.string().trim().max(max).optional());
const nullableDate = z.union([z.string(), z.date()]).nullish();
const meetingType = z.enum(['OFFLINE', 'GOOGLE_MEET', 'ZOOM']);

const activityFields = {
    description: z.string().max(20_000).nullish(),
    callResult: z.string().max(5_000).nullish(),
    callDuration: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.coerce.number().int().min(0).optional()),
    meetingType: meetingType.nullish(),
    meetingLocation: z.string().max(250).nullish(),
    meetingJoinUrl: z.string().max(2_000).nullish(),
    status: optionalText(50),
    priority: optionalText(50),
    assignedTo: optionalText(200),
    assignedMemberId: z.string().max(64).nullish(),
    scheduledAt: nullableDate,
    dueAt: nullableDate,
    reminderAt: nullableDate,
    metadata: z.record(z.string(), z.any()).optional(),
};

/** Body tạo hoạt động. Trường lạ bị loại bỏ; workspaceId / creatorId lấy từ request đã xác minh. */
export const createActivitySchema = z.object({
    ...activityFields,
    customerId: optionalText(128),
    contactId: optionalText(64),
    type: z.nativeEnum(ActivityTypeEnum).optional(),
    title: z.string().trim().min(1, 'Tiêu đề là bắt buộc').max(250),
});

/** Body cập nhật hoạt động. */
export const updateActivitySchema = z.object({
    ...activityFields,
    title: optionalText(250),
    completedAt: nullableDate,
    isReminderSent: z.boolean().optional(),
});

export type CreateActivityDto = z.infer<typeof createActivitySchema> & { workspaceId: string };
export type UpdateActivityDto = z.infer<typeof updateActivitySchema>;

export class ActivityFilterDto {
    workspaceId?: string;
    customerId?: string;
    type?: string;
    status?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number | string;
    limit?: number | string;
}
