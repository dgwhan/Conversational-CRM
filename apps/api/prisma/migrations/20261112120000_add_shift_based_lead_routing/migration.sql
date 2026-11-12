-- Add immutable workspace-scoped business audit context and actions.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHIFT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHIFT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHIFT_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHIFT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHIFT_MEMBER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SHIFT_CAPACITY_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_ABSENCE_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_ABSENCE_ENDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OVERTIME_CONSENT_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_ASSIGNMENT_LOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'STAFF_ASSIGNMENT_UNLOCKED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAD_AUTO_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAD_MANUALLY_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAD_CLAIMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAD_HANDED_OVER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAD_QUEUED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LEAD_ESCALATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OFFBOARDING_STARTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'OFFBOARDING_COMPLETED';

ALTER TABLE "audit_logs" ADD COLUMN "workspace_id" UUID;
CREATE INDEX "audit_logs_workspace_id_created_at_idx" ON "audit_logs"("workspace_id", "created_at" DESC);
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD COLUMN "assignment_locked" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TYPE "availability_exception_type" AS ENUM ('UNEXPECTED_LEAVE', 'OVERTIME_CONSENT');
CREATE TYPE "availability_exception_status" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');
CREATE TYPE "lead_queue_reason" AS ENUM ('NO_CAPACITY', 'NO_ACTIVE_SHIFT', 'UNEXPECTED_LEAVE', 'HANDOVER_REQUIRED');
CREATE TYPE "lead_queue_status" AS ENUM ('WAITING', 'ASSIGNED', 'CANCELLED');

CREATE TABLE "work_shifts" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "start_time" VARCHAR(5) NOT NULL,
  "end_time" VARCHAR(5) NOT NULL,
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  "weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "used_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "work_shifts_workspace_id_is_active_idx" ON "work_shifts"("workspace_id", "is_active");
ALTER TABLE "work_shifts" ADD CONSTRAINT "work_shifts_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "work_shift_members" (
  "id" UUID NOT NULL,
  "shift_id" UUID NOT NULL,
  "workspace_member_id" UUID NOT NULL,
  "lead_capacity" INTEGER NOT NULL DEFAULT 10,
  "is_shift_manager" BOOLEAN NOT NULL DEFAULT FALSE,
  "last_assigned_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "work_shift_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_shift_members_lead_capacity_check" CHECK ("lead_capacity" >= 0)
);
CREATE UNIQUE INDEX "work_shift_members_shift_id_workspace_member_id_key" ON "work_shift_members"("shift_id", "workspace_member_id");
CREATE INDEX "work_shift_members_workspace_member_id_idx" ON "work_shift_members"("workspace_member_id");
ALTER TABLE "work_shift_members" ADD CONSTRAINT "work_shift_members_shift_id_fkey"
  FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_shift_members" ADD CONSTRAINT "work_shift_members_workspace_member_id_fkey"
  FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "staff_availability_exceptions" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "workspace_member_id" UUID NOT NULL,
  "shift_id" UUID,
  "type" "availability_exception_type" NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "ends_at" TIMESTAMPTZ(3),
  "status" "availability_exception_status" NOT NULL DEFAULT 'ACTIVE',
  "reason_code" VARCHAR(64),
  "note" VARCHAR(500),
  "requested_by_id" UUID NOT NULL,
  "approved_by_id" UUID,
  "consent_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "staff_availability_exceptions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "staff_availability_exceptions_workspace_id_status_starts_at_idx"
  ON "staff_availability_exceptions"("workspace_id", "status", "starts_at");
CREATE INDEX "staff_availability_exceptions_workspace_member_id_status_starts_at_idx"
  ON "staff_availability_exceptions"("workspace_member_id", "status", "starts_at");
CREATE INDEX "staff_availability_exceptions_shift_id_status_starts_at_idx"
  ON "staff_availability_exceptions"("shift_id", "status", "starts_at");
ALTER TABLE "staff_availability_exceptions" ADD CONSTRAINT "staff_availability_exceptions_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_availability_exceptions" ADD CONSTRAINT "staff_availability_exceptions_workspace_member_id_fkey"
  FOREIGN KEY ("workspace_member_id") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_availability_exceptions" ADD CONSTRAINT "staff_availability_exceptions_shift_id_fkey"
  FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "lead_queue_entries" (
  "id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "conversation_id" UUID NOT NULL,
  "reason" "lead_queue_reason" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "status" "lead_queue_status" NOT NULL DEFAULT 'WAITING',
  "queued_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "escalation_level" INTEGER NOT NULL DEFAULT 0,
  "last_escalated_at" TIMESTAMPTZ(3),
  "assigned_at" TIMESTAMPTZ(3),
  "assigned_by_id" UUID,
  "resolved_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "lead_queue_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "lead_queue_entries_conversation_id_key" ON "lead_queue_entries"("conversation_id");
CREATE INDEX "lead_queue_entries_workspace_id_status_priority_queued_at_idx"
  ON "lead_queue_entries"("workspace_id", "status", "priority", "queued_at");
ALTER TABLE "lead_queue_entries" ADD CONSTRAINT "lead_queue_entries_workspace_id_fkey"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_queue_entries" ADD CONSTRAINT "lead_queue_entries_conversation_id_fkey"
  FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
