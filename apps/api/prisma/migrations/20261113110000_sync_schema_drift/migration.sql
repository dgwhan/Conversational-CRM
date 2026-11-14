-- Bù các thay đổi schema từng được áp bằng `prisma db push` mà không có migration
-- (bảng deals, activities, keyword_rules, cột hồ sơ, enum vai trò...). Thiếu chúng thì
-- `prisma migrate deploy` trên DB trống lỗi ở migration 20261113120000 ("relation deals does not exist").
-- Mọi câu lệnh đều chạy lại được (IF NOT EXISTS / DO block) để không hỏng trên DB đã có sẵn các đối tượng này.

-- Enums
DO $$ BEGIN
  CREATE TYPE "activity_type" AS ENUM ('CALL', 'MEETING', 'TASK', 'NOTE', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'TASK_REMINDER';
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'ACTIVITY_LOG';

-- workspace_member_role chỉ còn OWNER/STAFF. Ứng dụng vốn đã coi mọi vai trò khác OWNER là STAFF
-- (resolveWorkspaceMembership), nên ADMIN/AGENT cũ được chuyển thành STAFF để giữ nguyên quyền thực tế.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'workspace_member_role' AND e.enumlabel IN ('ADMIN', 'AGENT')
  ) THEN
    CREATE TYPE "workspace_member_role_new" AS ENUM ('OWNER', 'STAFF');
    ALTER TABLE "workspace_members" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "workspace_members" ALTER COLUMN "role" TYPE "workspace_member_role_new"
      USING (CASE "role"::text WHEN 'OWNER' THEN 'OWNER' ELSE 'STAFF' END::"workspace_member_role_new");
    ALTER TYPE "workspace_member_role" RENAME TO "workspace_member_role_old";
    ALTER TYPE "workspace_member_role_new" RENAME TO "workspace_member_role";
    DROP TYPE "workspace_member_role_old";
  END IF;
END $$;
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'STAFF';

-- Cột mới trên contacts / customers
ALTER TABLE "contacts"
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
  ADD COLUMN IF NOT EXISTS "id_card" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "school" VARCHAR(255);

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
  ADD COLUMN IF NOT EXISTS "id_card" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "school" VARCHAR(255),
  ALTER COLUMN "phone" SET DATA TYPE VARCHAR(50),
  ALTER COLUMN "email" SET DATA TYPE VARCHAR(255);

-- users.role đã bỏ khỏi schema
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
DROP TYPE IF EXISTS "StaffRole";

-- Prisma tự sinh id/updated_at ở phía client, không cần default trong DB
ALTER TABLE "contact_merge_logs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "customer_merge_logs" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "notifications" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "workspace_configurations" ALTER COLUMN "id" DROP DEFAULT, ALTER COLUMN "updated_at" DROP DEFAULT;

-- Bảng mới
CREATE TABLE IF NOT EXISTS "deals" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "customer_id" UUID,
    "contact_id" UUID,
    "assigned_member_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "stage" VARCHAR(50) NOT NULL DEFAULT 'STAGE_NEW',
    "pipeline_id" VARCHAR(100),
    "intake" VARCHAR(100),
    "courses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "expected_revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual_revenue" DOUBLE PRECISION DEFAULT 0,
    "priority" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    "lost_reason" VARCHAR(255),
    "expected_close_date" TIMESTAMPTZ(3),
    "actual_close_date" TIMESTAMPTZ(3),
    "assigned_staff_name" VARCHAR(255),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activities" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "customer_id" UUID,
    "contact_id" UUID,
    "deal_id" UUID,
    "creator_id" UUID,
    "assigned_member_id" UUID,
    "type" "activity_type" NOT NULL DEFAULT 'TASK',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "call_result" VARCHAR(255),
    "call_duration" INTEGER DEFAULT 0,
    "meeting_type" VARCHAR(100) DEFAULT 'OFFLINE',
    "meeting_location" VARCHAR(500),
    "meeting_join_url" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "priority" VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "assigned_to" VARCHAR(255),
    "scheduled_at" TIMESTAMPTZ(3),
    "due_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "reminder_at" TIMESTAMPTZ(3),
    "is_reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "keyword_rules" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "group" VARCHAR(50) NOT NULL,
    "keyword" VARCHAR(255) NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "keyword_rules_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX IF NOT EXISTS "deals_workspace_id_stage_idx" ON "deals"("workspace_id", "stage");
CREATE INDEX IF NOT EXISTS "deals_customer_id_idx" ON "deals"("customer_id");
CREATE INDEX IF NOT EXISTS "deals_contact_id_idx" ON "deals"("contact_id");
CREATE INDEX IF NOT EXISTS "deals_assigned_member_id_idx" ON "deals"("assigned_member_id");
CREATE INDEX IF NOT EXISTS "deals_status_idx" ON "deals"("status");
CREATE INDEX IF NOT EXISTS "activities_workspace_id_type_status_idx" ON "activities"("workspace_id", "type", "status");
CREATE INDEX IF NOT EXISTS "activities_customer_id_idx" ON "activities"("customer_id");
CREATE INDEX IF NOT EXISTS "activities_deal_id_idx" ON "activities"("deal_id");
CREATE INDEX IF NOT EXISTS "activities_assigned_member_id_idx" ON "activities"("assigned_member_id");
CREATE INDEX IF NOT EXISTS "activities_scheduled_at_idx" ON "activities"("scheduled_at");
CREATE INDEX IF NOT EXISTS "activities_due_at_idx" ON "activities"("due_at");
CREATE INDEX IF NOT EXISTS "keyword_rules_workspace_id_is_active_idx" ON "keyword_rules"("workspace_id", "is_active");
CREATE INDEX IF NOT EXISTS "keyword_rules_group_idx" ON "keyword_rules"("group");
CREATE INDEX IF NOT EXISTS "conversations_assigned_member_id_idx" ON "conversations"("assigned_member_id");

-- Khóa ngoại (ADD CONSTRAINT không có IF NOT EXISTS nên bắt duplicate_object)
DO $$ BEGIN
  ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "deals" ADD CONSTRAINT "deals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_member_id_fkey" FOREIGN KEY ("assigned_member_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activities" ADD CONSTRAINT "activities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "activities" ADD CONSTRAINT "activities_assigned_member_id_fkey" FOREIGN KEY ("assigned_member_id") REFERENCES "workspace_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
