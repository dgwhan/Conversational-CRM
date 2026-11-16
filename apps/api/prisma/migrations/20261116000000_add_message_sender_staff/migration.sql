ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "sender_staff_id" TEXT,
  ADD COLUMN IF NOT EXISTS "sender_staff_name" TEXT;
