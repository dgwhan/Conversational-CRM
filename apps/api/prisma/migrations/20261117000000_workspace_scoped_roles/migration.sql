UPDATE "workspace_members"
SET "role" = 'MANAGER'
WHERE "is_workspace_manager" = TRUE AND "role" = 'STAFF';

ALTER TABLE "workspace_members"
DROP COLUMN "is_workspace_manager";
