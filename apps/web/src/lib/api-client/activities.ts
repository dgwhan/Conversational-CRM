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

// Storage key cho Mock Fallback khi offline
const LOCAL_STORAGE_KEY = 'crm_activities_mock_store';

function getLocalActivities(): ActivityItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalActivities(items: ActivityItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function createActivityApi(client: BaseApiClient) {
  return {
    async getActivities(params: ActivityFilterParams = {}): Promise<{
      items: ActivityItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }> {
      try {
        const query = new URLSearchParams();
        if (params.workspaceId) query.set('workspaceId', params.workspaceId);
        if (params.customerId) query.set('customerId', params.customerId);
        if (params.type && params.type !== 'ALL') query.set('type', params.type);
        if (params.status && params.status !== 'ALL') query.set('status', params.status);
        if (params.priority && params.priority !== 'ALL') query.set('priority', params.priority);
        if (params.startDate) query.set('startDate', params.startDate);
        if (params.endDate) query.set('endDate', params.endDate);
        if (params.search) query.set('search', params.search);
        if (params.page) query.set('page', String(params.page));
        if (params.limit) query.set('limit', String(params.limit));

        const res = await client.request<{
          items: ActivityItem[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>(`/activities?${query.toString()}`);
        return res;
      } catch (err) {
        // Fallback local storage
        let list = getLocalActivities();
        if (params.customerId) {
          list = list.filter((a) => a.customerId === params.customerId);
        }
        if (params.type && params.type !== 'ALL') {
          list = list.filter((a) => a.type === params.type);
        }
        if (params.status && params.status !== 'ALL') {
          list = list.filter((a) => a.status === params.status);
        }
        if (params.search) {
          const s = params.search.toLowerCase();
          list = list.filter(
            (a) =>
              a.title.toLowerCase().includes(s) ||
              a.description?.toLowerCase().includes(s) ||
              a.assignedTo?.toLowerCase().includes(s)
          );
        }
        return {
          items: list,
          total: list.length,
          page: 1,
          limit: 100,
          totalPages: 1,
        };
      }
    },

    async getCalendarEvents(params: {
      workspaceId?: string;
      startDate?: string;
      endDate?: string;
    } = {}): Promise<any[]> {
      try {
        const query = new URLSearchParams();
        if (params.workspaceId) query.set('workspaceId', params.workspaceId);
        if (params.startDate) query.set('startDate', params.startDate);
        if (params.endDate) query.set('endDate', params.endDate);

        return await client.request<any[]>(`/activities/calendar?${query.toString()}`);
      } catch (err) {
        const local = getLocalActivities();
        return local.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          type: item.type,
          status: item.status,
          priority: item.priority,
          date: item.scheduledAt || item.dueAt || item.createdAt,
          scheduledAt: item.scheduledAt,
          dueAt: item.dueAt,
          completedAt: item.completedAt,
          meetingType: item.meetingType,
          meetingLocation: item.meetingLocation,
          meetingJoinUrl: item.meetingJoinUrl,
          callDuration: item.callDuration,
          callResult: item.callResult,
          assignedTo: item.assignedTo,
          customer: item.customer,
        }));
      }
    },

    async getActivityById(id: string): Promise<ActivityItem> {
      try {
        return await client.request<ActivityItem>(`/activities/${id}`);
      } catch {
        const item = getLocalActivities().find((a) => a.id === id);
        if (!item) throw new Error('Không tìm thấy hoạt động');
        return item;
      }
    },

    async createActivity(payload: CreateActivityPayload): Promise<ActivityItem> {
      try {
        const created = await client.request<ActivityItem>('/activities', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        // Cache local
        const local = getLocalActivities();
        local.unshift(created);
        saveLocalActivities(local);
        return created;
      } catch {
        // Fallback tạo local
        const newItem: ActivityItem = {
          id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          workspaceId: payload.workspaceId || 'ws-default',
          customerId: payload.customerId,
          contactId: payload.contactId,
          type: payload.type || 'TASK',
          title: payload.title,
          description: payload.description,
          callResult: payload.callResult,
          callDuration: payload.callDuration,
          meetingType: payload.meetingType || 'OFFLINE',
          meetingLocation: payload.meetingLocation,
          meetingJoinUrl: payload.meetingJoinUrl,
          status: payload.status || 'PENDING',
          priority: payload.priority || 'MEDIUM',
          assignedTo: payload.assignedTo || 'Tư vấn viên',
          scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt).toISOString() : null,
          dueAt: payload.dueAt ? new Date(payload.dueAt).toISOString() : null,
          reminderAt: payload.reminderAt ? new Date(payload.reminderAt).toISOString() : null,
          metadata: payload.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const local = getLocalActivities();
        local.unshift(newItem);
        saveLocalActivities(local);
        return newItem;
      }
    },

    async updateActivity(id: string, payload: UpdateActivityPayload): Promise<ActivityItem> {
      try {
        const updated = await client.request<ActivityItem>(`/activities/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        const local = getLocalActivities().map((a) => (a.id === id ? { ...a, ...updated } : a));
        saveLocalActivities(local);
        return updated;
      } catch {
        const local = getLocalActivities();
        const idx = local.findIndex((a) => a.id === id);
        if (idx !== -1) {
          const updated: ActivityItem = {
            ...local[idx],
            ...payload,
            scheduledAt: payload.scheduledAt !== undefined ? (payload.scheduledAt ? new Date(payload.scheduledAt).toISOString() : null) : local[idx].scheduledAt,
            dueAt: payload.dueAt !== undefined ? (payload.dueAt ? new Date(payload.dueAt).toISOString() : null) : local[idx].dueAt,
            completedAt: payload.completedAt !== undefined ? (payload.completedAt ? new Date(payload.completedAt).toISOString() : null) : (payload.status === 'COMPLETED' ? new Date().toISOString() : local[idx].completedAt),
            updatedAt: new Date().toISOString(),
          };
          local[idx] = updated;
          saveLocalActivities(local);
          return updated;
        }
        throw new Error('Hoạt động không tồn tại');
      }
    },

    async deleteActivity(id: string): Promise<{ success: boolean }> {
      try {
        await client.request<{ success: boolean }>(`/activities/${id}`, {
          method: 'DELETE',
        });
      } catch {}
      const local = getLocalActivities().filter((a) => a.id !== id);
      saveLocalActivities(local);
      return { success: true };
    },

    async getDueReminders(workspaceId?: string): Promise<ActivityItem[]> {
      try {
        const query = workspaceId ? `?workspaceId=${workspaceId}` : '';
        return await client.request<ActivityItem[]>(`/activities/due-reminders${query}`);
      } catch {
        const now = new Date();
        const next15Min = new Date(now.getTime() + 15 * 60000);
        return getLocalActivities().filter((a) => {
          if (a.status !== 'PENDING') return false;
          const target = a.dueAt ? new Date(a.dueAt) : (a.scheduledAt ? new Date(a.scheduledAt) : null);
          return target && target <= next15Min;
        });
      }
    },

    async triggerAutoTestTask(payload: {
      workspaceId?: string;
      customerId: string;
      customerName: string;
      notes?: string;
    }): Promise<ActivityItem> {
      try {
        return await client.request<ActivityItem>('/activities/auto-test-task', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        const scheduled = new Date();
        scheduled.setDate(scheduled.getDate() + 2);
        scheduled.setHours(9, 0, 0, 0);

        return this.createActivity({
          workspaceId: payload.workspaceId,
          customerId: payload.customerId,
          type: 'TASK',
          title: `Xếp phòng máy & chuẩn bị đề test đầu vào cho ${payload.customerName}`,
          description: `Tự động tạo bởi Hệ thống Tuyển sinh CUSC: Thí sinh "${payload.customerName}" vừa được xác nhận lịch Hẹn làm bài test đầu vào. Phòng Đào tạo vui lòng kiểm tra phòng máy thực hành và phân công cán bộ coi thi.`,
          priority: 'HIGH',
          status: 'PENDING',
          assignedTo: 'Phòng Đào tạo',
          scheduledAt: scheduled,
          dueAt: scheduled,
        });
      }
    },
  };
}
