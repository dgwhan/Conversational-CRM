-- AlterTable
ALTER TABLE "contacts" ADD COLUMN "workspace_id" UUID;

-- AlterTable
ALTER TABLE "channel_identities" ADD COLUMN "workspace_id" UUID;

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_LOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_UNLOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'WORKSPACE_TRANSFERRED';

-- CreateIndex
CREATE INDEX "contacts_workspace_id_idx" ON "contacts"("workspace_id");

-- CreateIndex
CREATE INDEX "channel_identities_workspace_id_idx" ON "channel_identities"("workspace_id");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_identities" ADD CONSTRAINT "channel_identities_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

