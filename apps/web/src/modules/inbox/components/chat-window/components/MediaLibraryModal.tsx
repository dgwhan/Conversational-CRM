import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, FileText, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, Video, Volume2, X } from 'lucide-react';
import { Modal } from '../../../../../components/ui/Modal.js';
import { SearchInput } from '../../../../../components/ui/SearchInput.js';
import { notify } from '../../../../../components/feedback/toastEmitter.js';
import { confirmDialog } from '../../../../../components/feedback/confirmDialog.js';
import { apiClient } from '../../../../../lib/api-client/index.js';
import type { MediaAsset } from '../../../../../lib/api-client/outbound-media.js';
import { formatBytes, validateForChannel, type OutboundChannel } from '../../../utils/outboundMediaRules.js';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (assets: MediaAsset[]) => void;
  /** Chủ workspace được thêm / đổi tên / xóa tài liệu */
  canManage: boolean;
  channel: OutboundChannel;
}

/** Ảnh thu nhỏ tải qua endpoint cần đăng nhập */
const Thumb: React.FC<{ asset: MediaAsset }> = ({ asset }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (asset.kind !== 'IMAGE') return;
    let url: string | null = null;
    apiClient
      .fetchBlob(asset.contentUrl)
      .then((b) => {
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => undefined);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [asset.contentUrl, asset.kind]);

  const icon =
    asset.kind === 'IMAGE' ? <ImageIcon size={20} /> : asset.kind === 'AUDIO' ? <Volume2 size={20} /> : asset.kind === 'VIDEO' ? <Video size={20} /> : <FileText size={20} />;
  return src ? (
    <img src={src} alt="" className="h-12 w-12 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-blue-600">{icon}</span>
  );
};

/**
 * Thư viện tài liệu tuyển sinh dùng lại (brochure, bảng học phí, hướng dẫn hồ sơ…):
 * tư vấn viên chọn để gửi ngay, không phải tìm tệp trên máy mỗi lần.
 */
export const MediaLibraryModal: React.FC<MediaLibraryModalProps> = ({ isOpen, onClose, onSelect, canManage, channel }) => {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState<number | null>(null);
  /** Tệp vừa chọn, chờ đặt tên hiển thị trước khi tải lên */
  const [draft, setDraft] = useState<{ file: File; title: string } | null>(null);
  /** Tài liệu đang đổi tên tại chỗ */
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestSeq = useRef(0);

  const load = useCallback(async (term = '') => {
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      const result = await apiClient.outboundMediaApi.listLibrary(term);
      if (seq === requestSeq.current) setItems(result);
    } catch {
      if (seq === requestSeq.current) setItems([]);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set());
      setDraft(null);
      setEditing(null);
      load(search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const toggle = (asset: MediaAsset) => {
    const problem = validateForChannel(channel, asset.kind, asset.fileName, asset.sizeBytes);
    if (problem) {
      notify.warning(problem);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });
  };

  const chooseFile = (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (file) setDraft({ file, title: file.name.replace(/\.[^.]+$/, '') });
  };

  const uploadDraft = async () => {
    if (!draft) return;
    setUploading(0);
    try {
      const asset = await apiClient.outboundMediaApi.uploadToLibrary(draft.file, draft.file.name, draft.title.trim(), setUploading);
      setItems((prev) => [asset, ...prev]);
      setDraft(null);
      notify.success(`Đã thêm "${asset.title ?? asset.fileName}" vào thư viện.`);
    } catch (err) {
      notify.error((err as Error).message);
    } finally {
      setUploading(null);
    }
  };

  const saveRename = async () => {
    if (!editing) return;
    const title = editing.title.trim();
    if (!title) return;
    try {
      const updated = await apiClient.outboundMediaApi.renameLibraryItem(editing.id, title);
      setItems((prev) => prev.map((a) => (a.id === editing.id ? updated : a)));
      setEditing(null);
    } catch (err) {
      notify.error((err as Error).message);
    }
  };

  const remove = async (asset: MediaAsset) => {
    const ok = await confirmDialog({
      title: 'Xóa tài liệu khỏi thư viện?',
      message: `"${asset.title ?? asset.fileName}" sẽ bị xóa vĩnh viễn. Các tin đã gửi trước đó sẽ không mở lại được tệp này trong CRM.`,
      confirmText: 'Xóa',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await apiClient.outboundMediaApi.removeLibraryItem(asset.id);
      setItems((prev) => prev.filter((a) => a.id !== asset.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    } catch (err) {
      notify.error((err as Error).message);
    }
  };

  const confirmSelection = () => {
    onSelect(items.filter((a) => selected.has(a.id)));
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thư viện tài liệu"
      description="Chọn tài liệu để đính kèm vào tin nhắn. Tài liệu được lưu sẵn trên CRM nên gửi lại không cần tải lên."
      size="lg"
      primaryAction={{ label: selected.size > 0 ? `Đính kèm ${selected.size} tài liệu` : 'Đính kèm', onClick: confirmSelection, disabled: selected.size === 0 }}
      secondaryAction={{ label: 'Đóng', onClick: onClose, variant: 'outline' }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} onSearch={load} debounceMs={300} isLoading={loading && items.length > 0} placeholder="Tìm theo tên tài liệu" className="w-full sm:flex-1" />
          {canManage && (
            <>
              <input ref={fileRef} type="file" hidden onChange={(e) => chooseFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading !== null || draft !== null}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                {uploading !== null ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {uploading !== null ? `Đang tải ${uploading}%` : 'Thêm tài liệu'}
              </button>
            </>
          )}
        </div>

        {draft && (
          <form
            className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50/60 p-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              uploadDraft();
            }}
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
              Tên hiển thị của tài liệu
              <input
                autoFocus
                value={draft.title}
                maxLength={255}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Escape' && (e.stopPropagation(), setDraft(null))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <span className="truncate text-[11px] font-normal text-slate-500">
                {draft.file.name} · {formatBytes(draft.file.size)}
              </span>
            </label>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                disabled={uploading !== null}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={uploading !== null || !draft.title.trim()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading !== null ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading !== null ? `Đang tải ${uploading}%` : 'Tải lên'}
              </button>
            </div>
          </form>
        )}

        <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200">
          {loading && items.length === 0 ? (
            <p className="m-0 flex items-center justify-center gap-2 p-6 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Đang tải…
            </p>
          ) : items.length === 0 ? (
            <p className="m-0 p-6 text-center text-xs text-slate-500">
              {canManage ? 'Thư viện trống. Bấm "Thêm tài liệu" để tải brochure, bảng học phí…' : 'Thư viện trống. Liên hệ chủ workspace để thêm tài liệu.'}
            </p>
          ) : (
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {items.map((asset) => {
                const isSelected = selected.has(asset.id);
                const problem = validateForChannel(channel, asset.kind, asset.fileName, asset.sizeBytes);
                return (
                  <li key={asset.id} className={`flex items-center gap-3 px-3 py-2 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggle(asset)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-50"
                      aria-pressed={isSelected}
                      title={problem ?? undefined}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                      </span>
                      <Thumb asset={asset} />
                      <span className="min-w-0">
                        {editing?.id === asset.id ? (
                          <input
                            autoFocus
                            value={editing.title}
                            maxLength={255}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditing({ id: asset.id, title: e.target.value })}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveRename();
                              } else if (e.key === 'Escape') {
                                setEditing(null);
                              }
                            }}
                            aria-label="Tên tài liệu"
                            className="h-8 w-full rounded-md border border-blue-300 bg-white px-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          />
                        ) : (
                          <span className="block truncate text-sm font-semibold text-slate-800">{asset.title ?? asset.fileName}</span>
                        )}
                        <span className={`block truncate text-[11px] ${problem ? 'text-amber-600' : 'text-slate-500'}`}>
                          {problem ?? `${asset.fileName} · ${formatBytes(asset.sizeBytes)}`}
                        </span>
                      </span>
                    </button>
                    {canManage && (
                      <span className="flex shrink-0 gap-0.5">
                        {editing?.id === asset.id ? (
                          <>
                            <button type="button" onClick={saveRename} className="rounded p-1.5 text-blue-600 hover:bg-blue-50" aria-label="Lưu tên">
                              <Check size={14} />
                            </button>
                            <button type="button" onClick={() => setEditing(null)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Hủy đổi tên">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditing({ id: asset.id, title: asset.title ?? asset.fileName })}
                            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Đổi tên"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <button type="button" onClick={() => remove(asset)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Xóa">
                          <Trash2 size={14} />
                        </button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
