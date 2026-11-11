import type { BaseApiClient } from './core.js';
import type {
  MessageStorageMetrics,
  StorageRetentionPolicy,
  EstimatePurgeRequest,
  EstimatePurgeResponse,
  PurgeMessagesRequest,
  PurgeMessagesResponse,
} from './messaging-storage.types.js';

export function createMessageStorageApi(client: BaseApiClient) {
  return {
    async getMetrics(workspaceId?: string): Promise<MessageStorageMetrics> {
      return client.request<MessageStorageMetrics>('/messaging/storage/metrics', {
        params: workspaceId ? { workspaceId } : undefined,
      });
    },

    async getPolicy(workspaceId?: string): Promise<StorageRetentionPolicy> {
      return client.request<StorageRetentionPolicy>('/messaging/storage/policy', {
        params: workspaceId ? { workspaceId } : undefined,
      });
    },

    async updatePolicy(
      workspaceId: string,
      patch: Partial<StorageRetentionPolicy>,
    ): Promise<StorageRetentionPolicy> {
      return client.request<StorageRetentionPolicy>('/messaging/storage/policy', {
        method: 'PATCH',
        params: { workspaceId },
        body: JSON.stringify(patch),
      });
    },

    async estimatePurge(request: EstimatePurgeRequest): Promise<EstimatePurgeResponse> {
      return client.request<EstimatePurgeResponse>('/messaging/storage/estimate-purge', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    async purgeMessages(request: PurgeMessagesRequest): Promise<PurgeMessagesResponse> {
      return client.request<PurgeMessagesResponse>('/messaging/storage/purge', {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    async triggerRetentionNow(workspaceId?: string): Promise<PurgeMessagesResponse> {
      return client.request<PurgeMessagesResponse>('/messaging/storage/retention/trigger-now', {
        method: 'POST',
        params: workspaceId ? { workspaceId } : undefined,
      });
    },
  };
}
