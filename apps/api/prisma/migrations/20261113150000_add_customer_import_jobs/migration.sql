-- Nhập danh sách khách hàng từ file: lưu lịch sử từng lô và đánh dấu khách hàng theo lô để lọc / hoàn tác
CREATE TABLE "customer_import_jobs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID,
    "created_by_name" VARCHAR(255),
    "file_name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    "duplicate_strategy" VARCHAR(30) NOT NULL,
    "source" VARCHAR(150),
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "undone_at" TIMESTAMPTZ(3),
    "undone_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_import_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_import_jobs_workspace_id_created_at_idx" ON "customer_import_jobs"("workspace_id", "created_at");

ALTER TABLE "customer_import_jobs" ADD CONSTRAINT "customer_import_jobs_workspace_id_fkey"
    FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customers" ADD COLUMN "source" VARCHAR(150);
ALTER TABLE "customers" ADD COLUMN "import_job_id" UUID;

CREATE INDEX "customers_workspace_id_import_job_id_idx" ON "customers"("workspace_id", "import_job_id");

ALTER TABLE "customers" ADD CONSTRAINT "customers_import_job_id_fkey"
    FOREIGN KEY ("import_job_id") REFERENCES "customer_import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
