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

const LOCAL_STORAGE_DEALS_KEY = 'crm_deals_mock_store';

function getLocalDeals(): DealItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DEALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalDeals(items: DealItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_DEALS_KEY, JSON.stringify(items));
  } catch {}
}

export function createDealApi(client: BaseApiClient) {
  return {
    async getDeals(params: DealFilterParams = {}): Promise<{
      items: DealItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }> {
      try {
        const query = new URLSearchParams();
        if (params.workspaceId) query.set('workspaceId', params.workspaceId);
        if (params.customerId) query.set('customerId', params.customerId);
        if (params.contactId) query.set('contactId', params.contactId);
        if (params.stage && params.stage !== 'ALL') query.set('stage', params.stage);
        if (params.status && params.status !== 'ALL') query.set('status', params.status);
        if (params.intake && params.intake !== 'ALL') query.set('intake', params.intake);
        if (params.search) query.set('search', params.search);
        if (params.page) query.set('page', String(params.page));
        if (params.limit) query.set('limit', String(params.limit));

        return await client.request<{
          items: DealItem[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        }>(`/deals?${query.toString()}`);
      } catch (err) {
        let list = getLocalDeals();
        if (params.customerId) {
          list = list.filter((d) => d.customerId === params.customerId);
        }
        if (params.stage && params.stage !== 'ALL') {
          list = list.filter((d) => d.stage === params.stage);
        }
        if (params.search) {
          const s = params.search.toLowerCase();
          list = list.filter(
            (d) =>
              d.title.toLowerCase().includes(s) ||
              d.intake?.toLowerCase().includes(s) ||
              d.customer?.fullName.toLowerCase().includes(s)
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

    async getDealsByCustomer(customerId: string): Promise<DealItem[]> {
      try {
        return await client.request<DealItem[]>(`/deals/customer/${customerId}`);
      } catch {
        return getLocalDeals().filter((d) => d.customerId === customerId || d.contactId === customerId);
      }
    },

    async getDealById(id: string): Promise<DealItem> {
      try {
        return await client.request<DealItem>(`/deals/${id}`);
      } catch {
        const item = getLocalDeals().find((d) => d.id === id);
        if (!item) throw new Error('Không tìm thấy cơ hội tuyển sinh');
        return item;
      }
    },

    async createDeal(payload: CreateDealPayload): Promise<DealItem> {
      try {
        const created = await client.request<DealItem>('/deals', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const local = getLocalDeals();
        local.unshift(created);
        saveLocalDeals(local);
        return created;
      } catch {
        const newItem: DealItem = {
          id: `deal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          workspaceId: payload.workspaceId || 'ws-default',
          customerId: payload.customerId,
          contactId: payload.contactId,
          title: payload.title,
          stage: payload.stage || 'STAGE_NEW',
          pipelineId: payload.pipelineId,
          intake: payload.intake || 'K2026',
          courses: payload.courses || [],
          expectedRevenue: payload.expectedRevenue || 0,
          actualRevenue: payload.actualRevenue || 0,
          priority: (payload.priority as any) || 'MEDIUM',
          status: (payload.status as any) || 'OPEN',
          lostReason: payload.lostReason,
          expectedCloseDate: payload.expectedCloseDate ? new Date(payload.expectedCloseDate).toISOString() : null,
          assignedStaffName: payload.assignedStaffName || 'Tư vấn viên',
          notes: payload.notes,
          metadata: payload.metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const local = getLocalDeals();
        local.unshift(newItem);
        saveLocalDeals(local);
        return newItem;
      }
    },

    async updateDeal(id: string, payload: UpdateDealPayload): Promise<DealItem> {
      try {
        const updated = await client.request<DealItem>(`/deals/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        const local = getLocalDeals().map((d) => (d.id === id ? { ...d, ...updated } : d));
        saveLocalDeals(local);
        return updated;
      } catch {
        const local = getLocalDeals();
        const idx = local.findIndex((d) => d.id === id);
        if (idx !== -1) {
          const updated: DealItem = {
            ...local[idx],
            ...payload,
            priority: (payload.priority as any) || local[idx].priority,
            status: (payload.status as any) || local[idx].status,
            expectedCloseDate: payload.expectedCloseDate !== undefined ? (payload.expectedCloseDate ? new Date(payload.expectedCloseDate).toISOString() : null) : local[idx].expectedCloseDate,
            actualCloseDate: payload.actualCloseDate !== undefined ? (payload.actualCloseDate ? new Date(payload.actualCloseDate).toISOString() : null) : local[idx].actualCloseDate,
            updatedAt: new Date().toISOString(),
          };
          local[idx] = updated;
          saveLocalDeals(local);
          return updated;
        }
        throw new Error('Cơ hội không tồn tại');
      }
    },

    async deleteDeal(id: string): Promise<{ success: boolean }> {
      try {
        await client.request<{ success: boolean }>(`/deals/${id}`, {
          method: 'DELETE',
        });
      } catch {}
      const local = getLocalDeals().filter((d) => d.id !== id);
      saveLocalDeals(local);
      return { success: true };
    },
  };
}
