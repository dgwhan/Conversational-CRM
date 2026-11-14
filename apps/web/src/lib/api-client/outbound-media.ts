import type { BaseApiClient } from './core.js';

export type OutboundKind = 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';

export interface MediaAsset {
  id: string;
  purpose: 'OUTBOUND' | 'LIBRARY';
  status: string;
  kind: OutboundKind;
  title: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdById: string | null;
  createdAt: string;
  /** Endpoint xem trước (cần đăng nhập → tải bằng fetchBlob) */
  contentUrl: string;
}

export function createOutboundMediaApi(client: BaseApiClient) {
  return {
    /** Tải tệp lên để gửi trong hội thoại (chờ gửi tối đa 24 giờ) */
    upload(file: Blob, fileName: string, opts: { kind?: OutboundKind; onProgress?: (p: number) => void; signal?: AbortSignal } = {}) {
      return client.uploadFile<MediaAsset>('/messaging/outbound-media', file, fileName, {
        params: { kind: opts.kind },
        onProgress: opts.onProgress,
        signal: opts.signal,
      });
    },
    /** Bỏ tệp đã tải lên nhưng chưa gửi */
    discard(id: string) {
      return client.delete<void>(`/messaging/outbound-media/${encodeURIComponent(id)}`, { skipToast: true });
    },
    listLibrary(search?: string) {
      return client.get<MediaAsset[]>('/messaging/media-library', { params: { search: search || undefined } });
    },
    uploadToLibrary(file: Blob, fileName: string, title: string, onProgress?: (p: number) => void) {
      return client.uploadFile<MediaAsset>('/messaging/media-library', file, fileName, { params: { title }, onProgress });
    },
    renameLibraryItem(id: string, title: string) {
      return client.patch<MediaAsset>(`/messaging/media-library/${encodeURIComponent(id)}`, { title });
    },
    removeLibraryItem(id: string) {
      return client.delete<void>(`/messaging/media-library/${encodeURIComponent(id)}`);
    },
  };
}
