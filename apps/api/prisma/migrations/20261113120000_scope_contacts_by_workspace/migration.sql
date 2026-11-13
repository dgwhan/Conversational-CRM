-- Cô lập Contact theo workspace: trước đây contacts dùng chung toàn hệ thống và
-- phone_normalized là unique toàn cục.

ALTER TABLE "contacts" ADD COLUMN "workspace_id" UUID;

-- Backfill 1: từ cơ hội tuyển sinh (deals) gắn với contact
UPDATE "contacts" c
SET "workspace_id" = d."workspace_id"
FROM (
  SELECT DISTINCT ON ("contact_id") "contact_id", "workspace_id"
  FROM "deals"
  WHERE "contact_id" IS NOT NULL
  ORDER BY "contact_id", "created_at" ASC
) d
WHERE c."id" = d."contact_id" AND c."workspace_id" IS NULL;

-- Backfill 2: từ customer cùng channel identity
UPDATE "contacts" c
SET "workspace_id" = x."workspace_id"
FROM (
  SELECT DISTINCT ON (ci."contact_id") ci."contact_id", cu."workspace_id"
  FROM "channel_identities" ci
  JOIN "customers" cu ON cu."id" = ci."customer_id"
  WHERE ci."contact_id" IS NOT NULL AND cu."workspace_id" IS NOT NULL
  ORDER BY ci."contact_id", cu."created_at" ASC
) x
WHERE c."id" = x."contact_id" AND c."workspace_id" IS NULL;

DROP INDEX IF EXISTS "contacts_phone_normalized_key";

CREATE UNIQUE INDEX "contacts_workspace_id_phone_normalized_key" ON "contacts"("workspace_id", "phone_normalized");
CREATE INDEX "contacts_workspace_id_idx" ON "contacts"("workspace_id");

ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_workspace_id_fkey" FOREIGN KEY ("workspace_id")
  REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
