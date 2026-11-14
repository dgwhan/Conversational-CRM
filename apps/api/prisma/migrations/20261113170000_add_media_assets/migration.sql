-- Tệp gửi đi trong hội thoại và thư viện tài liệu dùng lại; nhị phân lưu ở object storage, bảng chỉ giữ metadata
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID,
    "purpose" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "kind" VARCHAR(20) NOT NULL,
    "title" VARCHAR(255),
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storage_key" VARCHAR(500) NOT NULL,
    "channel_refs" JSONB NOT NULL DEFAULT '{}',
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");
CREATE INDEX "media_assets_workspace_id_purpose_created_at_idx" ON "media_assets"("workspace_id", "purpose", "created_at");
CREATE INDEX "media_assets_status_created_at_idx" ON "media_assets"("status", "created_at");

ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
