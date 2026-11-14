import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../../../../lib/api-client/index.js';
import type { MediaAsset, OutboundKind } from '../../../../../lib/api-client/outbound-media.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { guessKind, validateForChannel, type OutboundChannel } from '../../../utils/outboundMediaRules.js';

export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export interface PendingAttachment {
  localId: string;
  fileName: string;
  kind: OutboundKind;
  sizeBytes: number;
  mimeType: string;
  /** Ảnh xem trước tại chỗ (blob URL) hoặc null */
  previewUrl: string | null;
  status: 'uploading' | 'ready' | 'error';
  progress: number;
  error?: string;
  assetId?: string;
  /** Lấy từ thư viện tài liệu: không xóa trên máy chủ khi bỏ khỏi khung soạn */
  fromLibrary?: boolean;
}

/**
 * Tệp đính kèm chờ gửi trong khung soạn tin: kiểm tra theo kênh → tải lên ngay (có tiến trình) → giữ assetId để gửi.
 * Bỏ tệp chưa gửi thì xóa luôn trên máy chủ (tài liệu thư viện thì không).
 */
export function useOutboundAttachments(channel: OutboundChannel) {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const patch = (localId: string, change: Partial<PendingAttachment>) =>
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...change } : it)));

  const addFiles = useCallback(
    (files: Iterable<File>, kindHint?: OutboundKind) => {
      const list = Array.from(files);
      const room = MAX_ATTACHMENTS_PER_MESSAGE - itemsRef.current.length;
      if (list.length > room) notify.warning(`Mỗi tin gửi tối đa ${MAX_ATTACHMENTS_PER_MESSAGE} tệp.`);

      for (const file of list.slice(0, Math.max(0, room))) {
        const kind = kindHint ?? guessKind(file);
        const problem = validateForChannel(channel, kind, file.name, file.size);
        if (problem || !kind) {
          notify.warning(problem ?? `"${file.name}": định dạng không được hỗ trợ.`);
          continue;
        }
        const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const previewUrl = kind === 'IMAGE' || kind === 'AUDIO' || kind === 'VIDEO' ? URL.createObjectURL(file) : null;
        setItems((prev) => [
          ...prev,
          { localId, fileName: file.name, kind, sizeBytes: file.size, mimeType: file.type, previewUrl, status: 'uploading', progress: 0 },
        ]);

        const controller = new AbortController();
        controllers.current.set(localId, controller);
        apiClient.outboundMediaApi
          .upload(file, file.name, {
            kind: kindHint,
            signal: controller.signal,
            onProgress: (p) => patch(localId, { progress: p }),
          })
          .then((asset: MediaAsset) =>
            patch(localId, {
              status: 'ready',
              progress: 100,
              assetId: asset.id,
              fileName: asset.fileName,
              kind: asset.kind,
              sizeBytes: asset.sizeBytes,
              mimeType: asset.mimeType,
            }),
          )
          .catch((err: Error) => {
            if (err.name === 'AbortError') return;
            patch(localId, { status: 'error', error: err.message });
          })
          .finally(() => controllers.current.delete(localId));
      }
    },
    [channel],
  );

  /** Thêm tài liệu có sẵn trong thư viện (không cần tải lên) */
  const addLibraryAssets = useCallback(
    (assets: MediaAsset[]) => {
      const accepted: PendingAttachment[] = [];
      for (const a of assets) {
        if (itemsRef.current.some((it) => it.assetId === a.id)) continue;
        const problem = validateForChannel(channel, a.kind, a.fileName, a.sizeBytes);
        if (problem) {
          notify.warning(problem);
          continue;
        }
        accepted.push({
          localId: `lib-${a.id}`,
          fileName: a.title ? `${a.title}` : a.fileName,
          kind: a.kind,
          sizeBytes: a.sizeBytes,
          mimeType: a.mimeType,
          previewUrl: null,
          status: 'ready',
          progress: 100,
          assetId: a.id,
          fromLibrary: true,
        });
      }
      setItems((prev) => [...prev, ...accepted].slice(0, MAX_ATTACHMENTS_PER_MESSAGE));
    },
    [channel],
  );

  const remove = useCallback((localId: string) => {
    const item = itemsRef.current.find((it) => it.localId === localId);
    if (!item) return;
    controllers.current.get(localId)?.abort();
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    if (item.assetId && !item.fromLibrary) apiClient.outboundMediaApi.discard(item.assetId).catch(() => undefined);
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }, []);

  /** Sau khi gửi thành công: dọn khung soạn (giữ blob xem trước cho tin tạm — trình duyệt tự giải phóng khi rời trang) */
  const clearAfterSend = useCallback(() => setItems([]), []);

  /** Đổi sang hội thoại khác: bỏ mọi tệp chưa gửi */
  const discardAll = useCallback(() => {
    for (const it of itemsRef.current) {
      controllers.current.get(it.localId)?.abort();
      if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
      if (it.assetId && !it.fromLibrary) apiClient.outboundMediaApi.discard(it.assetId).catch(() => undefined);
    }
    setItems([]);
  }, []);

  // Đổi hội thoại / rời trang: bỏ các tệp đã tải lên nhưng chưa gửi
  useEffect(
    () => () => {
      for (const it of itemsRef.current) {
        controllers.current.get(it.localId)?.abort();
        if (it.assetId && !it.fromLibrary) apiClient.outboundMediaApi.discard(it.assetId).catch(() => undefined);
      }
    },
    [],
  );

  const isUploading = items.some((it) => it.status === 'uploading');
  const hasErrors = items.some((it) => it.status === 'error');
  const readyAssetIds = items.filter((it) => it.status === 'ready' && it.assetId).map((it) => it.assetId!);

  return { items, addFiles, addLibraryAssets, remove, clearAfterSend, discardAll, isUploading, hasErrors, readyAssetIds };
}
