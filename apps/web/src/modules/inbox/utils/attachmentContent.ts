/** Nhãn nội dung do hệ thống sinh khi tin chỉ có đính kèm — không cần hiển thị lại dưới dạng chữ */
const PLACEHOLDER_CONTENT =
  /^\[(Hình ảnh|Nhãn dán|Sticker|Tệp đính kèm|Đính kèm|Tin nhắn thoại|Video|Tập tin đính kèm \/ media|Tệp: [^\]]+)\](?: \(\+\d+\))?$/;

export function isAttachmentPlaceholder(content?: string | null): boolean {
  return Boolean(content && PLACEHOLDER_CONTENT.test(content.trim()));
}
