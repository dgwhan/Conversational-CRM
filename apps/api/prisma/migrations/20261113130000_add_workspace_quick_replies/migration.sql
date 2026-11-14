-- Mẫu trả lời nhanh lưu theo workspace (trước đây chỉ nằm trong localStorage của từng trình duyệt)
ALTER TABLE "workspace_configurations" ADD COLUMN "quick_replies" JSONB;
