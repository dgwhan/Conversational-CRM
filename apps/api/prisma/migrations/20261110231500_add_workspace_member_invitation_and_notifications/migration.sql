-- CreateEnum
CREATE TYPE "workspace_member_status" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "notification_type" ADD VALUE 'WORKSPACE_INVITATION';

-- AlterTable
ALTER TABLE "workspace_members"
  ADD COLUMN "status" "workspace_member_status" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "invited_by_id" UUID,
  ADD COLUMN "invited_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "joined_at" TIMESTAMPTZ(3);

-- Update existing workspace_members to ACTIVE
UPDATE "workspace_members" SET "status" = 'ACTIVE', "joined_at" = "created_at" WHERE "status" = 'PENDING';

-- AlterTable
ALTER TABLE "notifications"
  ADD COLUMN "user_id" UUID;

-- CreateIndex
CREATE INDEX "workspace_members_workspace_id_status_idx" ON "workspace_members"("workspace_id", "status");
CREATE INDEX "workspace_members_user_id_status_idx" ON "workspace_members"("user_id", "status");
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

