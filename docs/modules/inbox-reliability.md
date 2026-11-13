# Tài liệu Kỹ thuật: Độ tin cậy của Unified Inbox (Ghép hội thoại, Trả lời tự động, Đồng bộ Zalo OA)

Ghi lại các lỗi logic đã sửa trong luồng nhận tin, nguyên nhân gốc, cách sửa và cách kiểm thử — để không tái phát khi sửa các phần liên quan.

---

## 1. Tin của khách này bị gắn vào hội thoại của khách khác

**Triệu chứng:** khi nhận tin Facebook mà chưa tìm thấy Customer theo PSID, tin bị gắn vào hội thoại đầu tiên của Page.

**Nguyên nhân:** truy vấn tìm hội thoại trong `MessageRepository.insertManyIgnoreDuplicate` (và `backfillNullFields`) dùng `{ channelAccountId, ...(customerId ? { customerId } : {}) }` — khi `customerId` rỗng điều kiện chỉ còn Page.

**Cách sửa** (`apps/api/src/modules/messaging/infrastructure/message.repository.ts`):
- `findConversationForSender(channelAccountId, customerId, externalUserId)`:
  1. Có `customerId` → tìm theo `(Page, customerId)`.
  2. Chưa có → chỉ lấy hội thoại **chưa gắn Customer** mà tin bên trong có cùng người gửi: tin đến so `senderExternalId` / `sender.id` / `from.id`; tin đi so `recipient.id` / `to.data[0].id`.
  3. Không bao giờ quay về "hội thoại bất kỳ của Page".
- `findCustomerIdByExternalUser`: tìm thêm trong bảng `channel_identities` (quan hệ `identities`), không chỉ cột JSON.
- `normalizeExternalUserId`: các giá trị giả (`unknown`, `unknown-sender`, `page-admin`…) không được coi là PSID; không xác định được người gửi lẫn Customer thì lưu tin với `conversation_id = NULL` thay vì gắn bừa.
- Hội thoại tạo trước khi có Customer được gắn `customerId` khi xác định được, tránh tách đôi hội thoại.

**Hạn chế:** bảng `conversations` chưa có cột PSID, nên khi chưa có Customer phải dò qua JSON `raw_payload` của tin. Nếu lượng tin lớn, nên thêm cột `external_user_id` có index vào `conversations`.

---

## 2. Trả lời tự động ngoài giờ không ổn định

Mã: `apps/api/src/modules/messaging/application/working-hours.service.ts`.

| # | Lỗi | Cách sửa |
| :--- | :--- | :--- |
| 1 | Khách gửi dồn nhiều tin → nhận nhiều tin tự động (các lượt xử lý song song đều thấy "chưa gửi") | Khóa theo `auto-reply:<tài khoản kênh>:<người gửi>` (`DistributedLockService`, Redis nếu có; TTL 30s). Lượt đến sau khi khóa đang giữ thì bỏ qua |
| 2 | Tin cũ (đồng bộ lịch sử, webhook đến muộn) vẫn kích hoạt trả lời | Bỏ qua tin cũ hơn **30 phút** (`MAX_INBOUND_AGE_MS`): không gắn tag, không trả lời |
| 3 | Cooldown vô hiệu khi chưa xác định được hội thoại | Cooldown kiểm tra theo hội thoại **hoặc** theo `(tài khoản kênh, rawPayload.recipient.id)` |
| 4 | Tin trả lời hiện 2 lần trên Inbox; gửi lỗi vẫn hiện như đã gửi | Dispatcher tự phát realtime; service chỉ phát khi dùng nhánh dự phòng (không có dispatcher) và đã lưu DB |
| 5 | Đúng 17:00 vẫn tính là trong giờ; ca qua đêm (22:00 → 06:00) luôn bị coi là ngoài giờ | `currentTime >= closeTime` là ngoài giờ; `openTime > closeTime` được xử lý như ca qua đêm |
| 6 | Không tìm được Customer theo `channel_identities` | Tìm thêm quan hệ `identities` |

**Hạn chế:** với ca qua đêm, phần sau nửa đêm được tính theo lịch của chính ngày đó (gần đúng). Không xác định được workspace thì dùng cấu hình mặc định `ws-default-001`.

---

## 3. Đồng bộ Zalo OA ghi sai hướng tin và nhân bản tin

Mã: `ChannelSyncService.syncZalo` (`apps/api/src/modules/channel-connection/application/channel-sync.service.ts`).

| Lỗi | Hậu quả | Cách sửa |
| :--- | :--- | :--- |
| Tin cuối của hội thoại luôn ghi `INBOUND` | Khi tư vấn viên là người nhắn cuối, khách vẫn nhận trả lời tự động; Inbox hiển thị sai chiều | Tin là của OA khi `from_id` = OA id, hoặc có `is_echo` / `direction: OUTBOUND`, hoặc (không có `from_id`) `src = 0`. Lưu `OUTBOUND` và không kích hoạt trả lời tự động |
| Thiếu `message_id` → id dựng từ `Date.now()` | Mỗi lần đồng bộ sinh thêm một tin "mới" và có thể trả lời tự động lại | Id ổn định: `zalo_sync_<OA>_<khách>_<thời điểm>_<sha1(nội dung)[0..12]>` |
| Thiếu thời điểm gửi → dùng giờ hiện tại | Lọt qua giới hạn 30 phút ở mục 2 | Chỉ chạy trả lời tự động từ đồng bộ khi tin cuối là của khách **và** có thời điểm gửi thật |

Ý nghĩa `src` (`0` = OA gửi, `1` = người dùng gửi) theo tài liệu Zalo OA; cần đối chiếu với phản hồi thật của endpoint `v2.0/oa/conversation`.

---

## 4. Đồng bộ Facebook bỏ sót tin chỉ có ảnh

`ChannelSyncService` trước đây bỏ qua tin không có chữ (`if (!m.message) continue`) và không xin trường `attachments` từ Graph API. Đã sửa: xin `attachments{id,mime_type,name,size,image_data,video_data,file_url}`, chuẩn hóa qua `attachmentsFromRawPayload`, nội dung dùng nhãn tóm tắt (`[Hình ảnh]`…). Xem thêm [Media](./media.md).

---

## 5. Kiểm thử

- `apps/api/src/modules/messaging/application/working-hours.service.spec.ts`: tin cũ bị bỏ qua, gửi dồn 3 tin chỉ trả lời 1 lần và không broadcast thừa, mốc 17:00, ca qua đêm (đồng hồ được cố định trong test).
- Toàn bộ test messaging / channel-connection chạy lại sau mỗi thay đổi.
- Thủ công: không có kịch bản gửi thật tới Zalo OA; nên log một phản hồi thật của API đồng bộ để xác nhận cấu trúc `last_message`.
