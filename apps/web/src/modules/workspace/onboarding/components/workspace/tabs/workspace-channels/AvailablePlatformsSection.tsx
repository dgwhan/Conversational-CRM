import React from "react";
import { Plus } from "lucide-react";
import { Button, PageSection } from "../../../../../../../components/ui/index.js";
import { CHANNEL_PLATFORMS_CONFIG } from "../../workspace.config.js";
import type { AvailablePlatformsSectionProps } from "./types.js";

export const AvailablePlatformsSection: React.FC<
  AvailablePlatformsSectionProps
> = ({ canManageChannels, onOpenConnectModal }) => (
  <PageSection
    title="Nền tảng khả dụng"
    subtitle="Khám phá các tích hợp bổ sung để mở rộng kênh tiếp cận khách hàng."
    className="border-t border-slate-200 pt-6"
  >
    {canManageChannels && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CHANNEL_PLATFORMS_CONFIG.map((platform) => (
          <div
            key={platform.key}
            className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-5 transition-all hover:border-blue-500 hover:shadow-xs"
          >
            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-bold text-slate-900">
                <span>{platform.name}</span>
                <span className={`badge ${platform.badgeClass}`}>
                  {platform.badge}
                </span>
              </div>
              <p className="m-0 text-xs leading-relaxed text-slate-500">
                {platform.description}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              icon={<Plus size={13} />}
              onClick={() => onOpenConnectModal(platform.key)}
            >
              {platform.actionLabel}
            </Button>
          </div>
        ))}
      </div>
    )}
  </PageSection>
);
