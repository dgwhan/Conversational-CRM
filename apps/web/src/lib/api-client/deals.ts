import type { BaseApiClient } from './core.js';
import type { ActivityItem } from './activities.js';

export interface DealCustomer {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  leadStatus?: string | null;
}

export interface DealContact {
  id: string;
  displayName: string;
  phoneNormalized?: string | null;
  email?: string | null;
}

export interface DealItem {
  id: string;
  workspaceId: string;
  customerId?: string | null;
  contactId?: string | null;
  assignedMemberId?: string | null;
  title: string;
  stage: string;
  pipelineId?: string | null;
  intake?: string | null; // Niên khóa: K2025, K2026-Đợt 1
  courses: string[];
  expectedRevenue: number;
  actualRevenue?: number | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'WON' | 'LOST';
  lostReason?: string | null;
  expectedCloseDate?: string | null;
  actualCloseDate?: string | null;
  assignedStaffName?: string | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  customer?: DealCustomer | null;
  contact?: DealContact | null;
  activities?: ActivityItem[];
}

export interface CreateDealPayload {
  workspaceId?: string;
  customerId?: string;
  contactId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  assignedMemberId?: string | null;
  title: string;
  stage?: string;
  pipelineId?: string;
  intake?: string;
  courses?: string[];
  expectedRevenue?: number;
  actualRevenue?: number;
  priority?: string;
  status?: string;
  lostReason?: string;
  expectedCloseDate?: string | Date;
  assignedStaffName?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateDealPayload {
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

export interface DealFilterParams {
  workspaceId?: string;
  customerId?: string;
  contactId?: string;
  stage?: string;
  status?: string;
  intake?: string;
  search?: string;
  page?: number;
  limit?: number;
}

type DealListResponse = {
  items: DealItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * API Cơ hội tuyển sinh. Mọi lỗi từ server được ném ra để giao diện báo cho người dùng —
 * không lưu "tạm" vào localStorage (trước đây gây cảm giác đã lưu trong khi server không có dữ liệu).
 */
export function createDealApi(client: BaseApiClient) {
  return {
    getDeals(params: DealFilterParams = {}): Promise<DealListResponse> {
      const query = new URLSearchParams();
      const set = (key: string, value: string | number | undefined) => {
        if (value !== undefined && value !== '' && value !== 'ALL') query.set(key, String(value));
      };
      set('workspaceId', params.workspaceId);
      set('customerId', params.customerId);
      set('contactId', params.contactId);
      set('stage', params.stage);
      set('status', params.status);
      set('intake', params.intake);
      set('search', params.search);
      set('page', params.page);
      set('limit', params.limit);
      return client.request<DealListResponse>(`/deals?${query.toString()}`);
    },

    getDealsByCustomer(customerId: string): Promise<DealItem[]> {
      return client.request<DealItem[]>(`/deals/customer/${customerId}`);
    },

    getDealById(id: string): Promise<DealItem> {
      return client.request<DealItem>(`/deals/${id}`);
    },

    createDeal(payload: CreateDealPayload): Promise<DealItem> {
      return client.request<DealItem>('/deals', { method: 'POST', body: JSON.stringify(payload) });
    },

    updateDeal(id: string, payload: UpdateDealPayload): Promise<DealItem> {
      return client.request<DealItem>(`/deals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },

    deleteDeal(id: string): Promise<{ success: boolean }> {
      return client.request<{ success: boolean }>(`/deals/${id}`, { method: 'DELETE' });
    },
  };
}
