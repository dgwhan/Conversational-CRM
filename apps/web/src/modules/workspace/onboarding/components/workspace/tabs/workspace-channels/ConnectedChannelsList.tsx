import React from "react";
import {
  Power,
  Plus,
  RefreshCw,
  RotateCcw,
  Share2,
  Sliders,
  Trash2,
} from "lucide-react";
import {
  Button,
  EmptyState,
  LoadingState,
  StatusBadge,
} from "../../../../../../../components/ui/index.js";
import {
  getChannelStatus,
} from "../../workspace.config.js";
import { ZaloTokenCountdown } from "../ZaloTokenCountdown.js";
import type { ConnectedChannelsListProps } from "./types.js";

export const ConnectedChannelsList: React.FC<ConnectedChannelsListProps> = ({
  channels,
  isLoading,
  hasActiveFilters,
  canManageChannels,
  canDisconnect,
  syncingChannelId,
  togglingChannelId,
  onOpenConnectModal,
  onOpenPlatformPicker,
  onOpenChannelDetails,
  onSyncChannel,
  onToggleChannel,
  onDisconnectChannel,
}) => (
  <div>
    {isLoading && <LoadingState message="Đang tải danh sách kênh kết nối..." />}

    {!isLoading && channels.length === 0 && (
      <EmptyState
        icon={<Share2 size={30} className="mx-auto text-slate-400" />}
        title={
          hasActiveFilters
            ? "Không tìm thấy kênh phù hợp"
            : "Chưa có kênh nào được kết nối vào không gian này"
        }
        description={
          hasActiveFilters
            ? "Không có kết quả nào khớp với bộ lọc hiện tại. Vui lòng thử từ khóa hoặc chọn nền tảng khác."
            : 'Nhấn "Thêm kênh" để kết nối Facebook Pages, Zalo OA hoặc TikTok và bắt đầu tiếp nhận tin nhắn khách hàng.'
        }
        action={
          canManageChannels && !hasActiveFilters ? (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={onOpenPlatformPicker}
            >
              Thêm kênh đầu tiên
            </Button>
          ) : undefined
        }
      />
    )}

    {!isLoading && channels.length > 0 && (
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 sm:px-6">
          <div className="flex items-center gap-2">
            <span>Kênh đã kết nối</span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700">
              {channels.length}
            </span>
          </div>
          <span className="text-[11px] font-normal normal-case text-slate-400">
            {channels.length === 1
              ? "1 kênh đang tích hợp"
              : `${channels.length} kênh đang tích hợp`}
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {channels.map((channel) => {
            const status = getChannelStatus(
              channel,
              syncingChannelId === channel.id,
            );
            const platformLabel =
              channel.channel === "FACEBOOK"
                ? "Facebook Messenger"
                : channel.channel === "ZALO"
                  ? channel.metadata?.isPersonal
                    ? "Zalo Cá nhân"
                    : "Zalo Official Account"
                  : channel.channel === "TIKTOK"
                    ? "TikTok"
                    : channel.channel;

            return (
              <div
                key={channel.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 px-5 transition-colors hover:bg-slate-50/70 sm:px-6 sm:p-5"
              >
                <div className="flex min-w-[260px] items-center gap-3.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50">
                    {channel.channel === "FACEBOOK" && (
                      <span className="text-xs font-bold tracking-wider text-blue-600">
                        FB
                      </span>
                    )}
                    {channel.channel === "ZALO" && (
                      <span className="text-xs font-bold tracking-wider text-sky-600">
                        ZL
                      </span>
                    )}
                    {channel.channel === "TIKTOK" && (
                      <span className="text-xs font-bold tracking-wider text-slate-900">
                        TT
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {channel.displayName}
                      </span>
                      <StatusBadge status={status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">
                        {platformLabel}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        ID: {channel.externalAccountId}
                      </span>
                      {channel.lastSyncAt && (
                        <>
                          <span>•</span>
                          <span>
                            Đồng bộ:{" "}
                            {new Date(channel.lastSyncAt).toLocaleTimeString(
                              "vi-VN",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </span>
                        </>
                      )}
                    </div>

                    {canManageChannels &&
                      channel.channel === "ZALO" &&
                      (channel.metadata?.isPersonal ||
                        channel.metadata?.engine === "zca-js" ||
                        channel.tokenExpiresAt) && (
                        <ZaloTokenCountdown
                          tokenExpiresAt={channel.tokenExpiresAt}
                          disconnectedAt={channel.disconnectedAt}
                          isActive={channel.isActive}
                          onRenew={() => onOpenConnectModal("ZALO")}
                        />
                      )}
                  </div>
                </div>

                {canManageChannels && (
                  <div className="flex items-center gap-2">
                    {channel.channel === "ZALO" && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<RotateCcw size={13} />}
                        onClick={() => onOpenConnectModal("ZALO")}
                        title="Gia hạn ngay phiên Zalo (Làm mới phiên 72h bằng cách quét lại mã QR)"
                      >
                        Gia hạn
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      loading={syncingChannelId === channel.id}
                      icon={
                        syncingChannelId !== channel.id ? (
                          <RefreshCw size={13} />
                        ) : undefined
                      }
                      onClick={() => onSyncChannel(channel.id)}
                      title="Đồng bộ tin nhắn mới nhất"
                    >
                      Đồng bộ
                    </Button>

                    {(status === "Expired" || status === "Error") && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<RotateCcw size={13} />}
                        onClick={() => onOpenConnectModal(channel.channel)}
                        title="Cấp lại quyền truy cập"
                      >
                        Kết nối lại
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Sliders size={13} />}
                      onClick={() => onOpenChannelDetails(channel)}
                    >
                      Quản lý
                    </Button>

                    <button
                      type="button"
                      onClick={() =>
                        onToggleChannel(channel.id, channel.isActive)
                      }
                      disabled={togglingChannelId === channel.id}
                      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      title={
                        channel.isActive
                          ? "Tạm dừng nhận tin nhắn"
                          : "Kích hoạt lại kênh"
                      }
                    >
                      <Power
                        size={13}
                        className={
                          channel.isActive ? "text-slate-400" : "text-emerald-600"
                        }
                      />
                    </button>

                    {canDisconnect && (
                      <button
                        type="button"
                        onClick={() =>
                          onDisconnectChannel(
                            channel.id,
                            channel.displayName,
                          )
                        }
                        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        title="Ngắt kết nối trang này khỏi không gian làm việc"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}
  </div>
);
