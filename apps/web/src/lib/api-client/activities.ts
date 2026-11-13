import type { BaseApiClient } from './core.js';

export type ActivityType = 'CALL' | 'MEETING' | 'TASK' | 'NOTE' | 'SYSTEM';
export type ActivityStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type ActivityPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type MeetingType = 'OFFLINE' | 'GOOGLE_MEET' | 'ZOOM';

export interface ActivityCustomer {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface ActivityItem {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  contactId?: string | null;
  creatorId?: string | null;
  assignedMemberId?: string | null;
  type: ActivityType;
  title: string;
  description?: string | null;
  callResult?: string | null;
  callDuration?: number | null;
  meetingType?: MeetingType | string | null;
  meetingLocation?: string | null;
  meetingJoinUrl?: string | null;
  status: ActivityStatus;
  priority: ActivityPriority;
  assignedTo?: string | null;
  scheduledAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  reminderAt?: string | null;
  isReminderSent?: boolean;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  customer?: ActivityCustomer | null;
}

export interface CreateActivityPayload {
  workspaceId?: string;
  customerId?: string;
  contactId?: string;
  type?: ActivityType;
  title: string;
  description?: string;
  callResult?: string;
  callDuration?: number;
  meetingType?: MeetingType;
  meetingLocation?: string;
  meetingJoinUrl?: string;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  assignedTo?: string;
  scheduledAt?: string | Date;
  dueAt?: string | Date;
  reminderAt?: string | Date;
  metadata?: Record<string, any>;
}

export interface UpdateActivityPayload {
  title?: string;
  description?: string;
  callResult?: string;
  callDuration?: number;
  meetingType?: MeetingType;
  meetingLocation?: string;
  meetingJoinUrl?: string;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  assignedTo?: string;
  scheduledAt?: string | Date | null;
  dueAt?: string | Date | null;
  completedAt?: string | Date | null;
  reminderAt?: string | Date | null;
  isReminderSent?: boolean;
  metadata?: Record<string, any>;
}

export interface ActivityFilterParams {
  workspaceId?: string;
  customerId?: string;
  type?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

type ActivityListResponse = {
  items: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** Chuỗi truy vấn bỏ qua giá trị rỗng và bộ lọc "ALL". */
function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== 'ALL') query.set(key, String(value));
  }
  const str = query.toString();
  return str ? `?${str}` : '';
}

/**
 * API Hoạt động (cuộc gọi, lịch hẹn, công việc). Lỗi từ server được ném ra để giao diện
 * báo cho người dùng — không lưu "tạm" vào localStorage.
 */
export function createActivityApi(client: BaseApiClient) {
  return {
    getActivities(params: ActivityFilterParams = {}): Promise<ActivityListResponse> {
      return client.request<ActivityListResponse>(`/activities${toQuery({ ...params })}`);
    },

    getCalendarEvents(params: { workspaceId?: string; startDate?: string; endDate?: string } = {}): Promise<any[]> {
      return client.request<any[]>(`/activities/calendar${toQuery(params)}`);
    },

    getActivityById(id: string): Promise<ActivityItem> {
      return client.request<ActivityItem>(`/activities/${id}`);
    },

    createActivity(payload: CreateActivityPayload): Promise<ActivityItem> {
      return client.request<ActivityItem>('/activities', { method: 'POST', body: JSON.stringify(payload) });
    },

    updateActivity(id: string, payload: UpdateActivityPayload): Promise<ActivityItem> {
      return client.request<ActivityItem>(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },

    deleteActivity(id: string): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>(`/activities/${id}`, { method: 'DELETE' });
    },

    getDueReminders(workspaceId?: string): Promise<ActivityItem[]> {
      return client.request<ActivityItem[]>(`/activities/due-reminders${toQuery({ workspaceId })}`);
    },

    triggerAutoTestTask(payload: {
      workspaceId?: string;
      customerId: string;
      customerName: string;
      notes?: string;
    }): Promise<ActivityItem> {
      return client.request<ActivityItem>('/activities/auto-test-task', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };
}
