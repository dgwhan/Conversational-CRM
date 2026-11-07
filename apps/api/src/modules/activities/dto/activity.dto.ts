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

export class CreateActivityDto {
    workspaceId!: string;
    customerId?: string;
    contactId?: string;
    creatorId?: string;
    assignedMemberId?: string;

    type?: ActivityTypeEnum;
    title!: string;
    description?: string;

    // Call properties
    callResult?: string;
    callDuration?: number;

    // Meeting properties
    meetingType?: 'OFFLINE' | 'GOOGLE_MEET' | 'ZOOM';
    meetingLocation?: string;
    meetingJoinUrl?: string;

    // Status & Priority
    status?: ActivityStatusEnum | string;
    priority?: ActivityPriorityEnum | string;
    assignedTo?: string;

    // Dates
    scheduledAt?: string | Date;
    dueAt?: string | Date;
    reminderAt?: string | Date;
    metadata?: Record<string, any>;
}

export class UpdateActivityDto {
    title?: string;
    description?: string;
    callResult?: string;
    callDuration?: number;
    meetingType?: 'OFFLINE' | 'GOOGLE_MEET' | 'ZOOM';
    meetingLocation?: string;
    meetingJoinUrl?: string;
    status?: ActivityStatusEnum | string;
    priority?: ActivityPriorityEnum | string;
    assignedTo?: string;
    assignedMemberId?: string | null;
    scheduledAt?: string | Date | null;
    dueAt?: string | Date | null;
    completedAt?: string | Date | null;
    reminderAt?: string | Date | null;
    isReminderSent?: boolean;
    metadata?: Record<string, any>;
}

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
