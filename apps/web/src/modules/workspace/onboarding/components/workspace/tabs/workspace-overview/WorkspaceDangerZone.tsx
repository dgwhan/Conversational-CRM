import React from "react";
import { Trash2 } from "lucide-react";
import { Button, PageSection } from "../../../../../../../components/ui/index.js";
import type { WorkspaceDangerZoneProps } from "./types.js";

export const WorkspaceDangerZone: React.FC<WorkspaceDangerZoneProps> = ({
  onDeleteWorkspace,
}) => (
  <PageSection
    title="Khu vực quản trị cấp cao"
    subtitle="Các thao tác nhạy cảm liên quan đến sự tồn tại của Không gian làm việc"
  >
    <div className="p-4 border border-red-200 bg-red-50/30 rounded-lg flex items-center justify-between gap-4 flex-wrap shadow-2xs">
      <div>
        <div className="text-xs font-bold text-red-900 mb-0.5">
          Xóa Không gian làm việc này
        </div>
        <div className="text-[11px] text-red-600">
          Xóa vĩnh viễn cấu hình phễu, phân quyền nhân viên và dữ liệu kênh kết
          nối trực thuộc.
        </div>
      </div>
      <Button
        variant="danger"
        size="sm"
        icon={<Trash2 size={13} />}
        onClick={onDeleteWorkspace}
      >
        Xóa workspace
      </Button>
    </div>
  </PageSection>
);
