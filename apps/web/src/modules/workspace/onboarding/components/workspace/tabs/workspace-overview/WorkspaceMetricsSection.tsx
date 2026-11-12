import React from "react";
import { PageSection } from "../../../../../../../components/ui/index.js";
import type { WorkspaceMetricsSectionProps } from "./types.js";

export const WorkspaceMetricsSection: React.FC<
  WorkspaceMetricsSectionProps
> = ({
  membersCount,
  channelsCount,
  contactsCount,
  isLoadingContacts,
}) => (
  <PageSection
    title="Tổng quan không gian làm việc"
    hasDivider
    className="pb-4"
  >
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs sm:p-4">
        <div className="mb-1 text-xs font-medium text-slate-500">
          Thành viên
        </div>
        <div className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          {membersCount}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs sm:p-4">
        <div className="mb-1 text-xs font-medium text-slate-500">
          Kênh kết nối
        </div>
        <div className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          {channelsCount}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs sm:p-4">
        <div className="mb-1 text-xs font-medium text-slate-500">
          Khách hàng liên hệ
        </div>
        <div className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          {isLoadingContacts ? (
            <span className="text-lg font-normal text-slate-400">...</span>
          ) : (
            (contactsCount ?? 0).toLocaleString()
          )}
        </div>
      </div>
    </div>
  </PageSection>
);
