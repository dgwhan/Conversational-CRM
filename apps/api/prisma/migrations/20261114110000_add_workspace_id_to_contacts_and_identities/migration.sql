-- AlterTable
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "workspace_id" UUID;

-- AlterTable
ALTER TABLE "channel_identities" ADD COLUMN IF NOT EXISTS "workspace_id" UUID;

-- AlterTable
ALTER TABLE "workspace_members" ADD COLUMN IF NOT EXISTS "is_workspace_manager" BOOLEAN NOT NULL DEFAULT false;

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_LOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_UNLOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WORKSPACE_TRANSFERRED';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contacts_workspace_id_idx" ON "contacts"("workspace_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "channel_identities_workspace_id_idx" ON "channel_identities"("workspace_id");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "channel_identities" ADD CONSTRAINT "channel_identities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'staff_availability_exceptions_workspace_member_id_status_starts') THEN
    ALTER INDEX "staff_availability_exceptions_workspace_member_id_status_starts" RENAME TO "staff_availability_exceptions_workspace_member_id_status_st_idx";
  END IF;
END $$;
