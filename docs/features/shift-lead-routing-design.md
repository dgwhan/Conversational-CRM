# Thiết kế triển khai: Ca trực, phân lead và audit

**Đối tượng:** Team phát triển CRM  
**Trạng thái:** Thiết kế nghiệp vụ/kỹ thuật để triển khai theo các quyết định Owner đã duyệt  
**Ngày:** 12/11/2026

## 1. Mục tiêu

Quản lý ca tư vấn theo workspace, tính sức chứa lead của từng nhân viên, tự động phân hội thoại mới và duy trì chăm sóc liên tục khi quá tải, nghỉ đột xuất, hết ca, khóa tài khoản hoặc thôi việc. Owner vẫn được phân công thủ công. Tất cả thay đổi quan trọng phải có lịch sử audit minh bạch.

## 2. Quyết định nghiệp vụ đã chốt

1. Hạn mức là số **hội thoại đang mở** nhân viên phụ trách cùng lúc.
2. Đơn vị lead là một hội thoại; các hội thoại của cùng một khách hàng vẫn được tính riêng.
3. Nhân viên đang trong ca là `ONLINE` cho nghiệp vụ nhận lead, trừ khi đang nghỉ/vắng mặt, bị khóa hoặc không còn là thành viên hoạt động. Kết nối trình duyệt/WebSocket là tín hiệu kỹ thuật riêng, không thay thế lịch ca.
4. Ca được phép chồng nhau. Sức chứa hiệu dụng bằng tổng hạn mức của các ca đang hoạt động mà nhân viên tham gia. Hạn mức hội thoại đang mở được đếm một lần trên workspace, không đếm lặp theo ca.
5. Khi một ca kết thúc, nếu tải hiện tại lớn hơn sức chứa còn lại, không thu hồi hoặc tự chuyển hội thoại đã giao; chỉ dừng giao lead mới cho đến khi tải xuống dưới sức chứa mới.
6. Owner được gán vượt hạn mức. UI hiển thị cảnh báo thông tin (ví dụ `16/15 hội thoại mở`) nhưng không chặn thao tác, không gắn mức nguy hiểm.
7. Ca đã sử dụng chỉ được tắt, không xóa vật lý.
8. Nghỉ đột xuất do Owner/ca trưởng ghi nhận. Owner/ca trưởng chọn chuyển lead sang người/ca phù hợp; nếu chưa chọn được người nhận thì lead vào hàng chờ hỗ trợ của đội.
9. Thôi việc phải hoàn tất bàn giao trước khi gỡ nhân viên khỏi workspace. Có quy trình khóa truy cập khẩn cấp; khi đó hội thoại phải được đưa vào hàng chờ đội hoặc được Owner chuyển ngay.
10. Nhân viên hết ca có thể tiếp tục tư vấn ngoài ca khi đã đồng ý nhận ca ngoài. Nếu không có xác nhận đồng ý, dừng phân lead mới và bàn giao lead đang cần tiếp tục xử lý.
11. Giai đoạn đầu chỉ gửi thông báo trong CRM.
12. Ghi audit đầy đủ thay đổi ca, giờ/ngày, thành viên ca, hạn mức, trạng thái nghỉ/khóa, đồng ý làm ngoài ca, assignment, bàn giao và escalation.

## 3. Phân biệt trạng thái

Không gom các khái niệm sau thành một status duy nhất:

| Khái niệm | Nguồn | Dùng cho |
|---|---|---|
| Ca đang hoạt động | Lịch ca + timezone + giờ hiện tại | Xác định nhân viên đang được xếp trực |
| Trạng thái nhận lead | Giá trị suy ra từ ca, nghỉ, khóa, membership | Điều kiện tự động phân lead; UI hiển thị Online/Không nhận lead |
| Kết nối Realtime | Heartbeat/WebSocket hiện tại | Chỉ báo kỹ thuật về kết nối; không tự gán lead |
| Membership | `WorkspaceMember.status`, `isActive` | Quyền tham gia workspace |
| Khóa tài khoản | Trạng thái tài khoản/`lockedAt` hiện có | Chặn truy cập và nhận phân công mới |
| Ngoại lệ lịch | Báo nghỉ, khóa nhận việc, ca ngoài đã đồng ý | Tạm ghi đè khả năng nhận lead theo ca |

**Điều kiện nhận tự động:** membership ACTIVE và hoạt động; tài khoản không khóa; đang trong ít nhất một ca đang chạy hoặc có ca ngoài được xác nhận; không có ngoại lệ nghỉ/vắng mặt; còn sức chứa. Ca đang chạy được hiển thị là Online theo quy tắc nghiệp vụ đã chốt. Nếu kết nối Realtime rớt, có thể hiển thị dấu hiệu mất kết nối riêng, nhưng không tự tạo nghỉ đột xuất.

## 4. Mô hình dữ liệu đề xuất

### 4.1 `WorkShift`

- `id`, `workspaceId`, `name`
- `startTime`, `endTime` (giờ địa phương)
- `timezone` (IANA timezone, ví dụ `Asia/Ho_Chi_Minh`)
- `weekdays` (ngày áp dụng)
- `isActive`, `createdAt`, `updatedAt`
- `deactivatedAt`, `deactivatedById` nếu cần hiển thị lịch sử tắt ca

Ca qua đêm được hỗ trợ: giờ kết thúc nhỏ hơn giờ bắt đầu nghĩa là kết thúc ngày kế tiếp. Thay đổi timezone/lịch có hiệu lực theo thời điểm lưu; không sửa lịch sử assignment đã xảy ra.

### 4.2 `WorkShiftMember`

- `id`, `shiftId`, `workspaceMemberId`
- `leadCapacity` (số hội thoại mở tối đa do cấu hình ca cấp)
- `createdAt`, `updatedAt`
- Unique `(shiftId, workspaceMemberId)`.

Nhân viên trong các ca đang chồng giờ có sức chứa hiệu dụng bằng tổng `leadCapacity` của các liên kết ca đang hoạt động. Tải hiện tại đếm tất cả conversation OPEN được gán cho member trong workspace một lần. Hạn mức thay đổi không tự đóng/chuyển hội thoại cũ.

### 4.3 `StaffAvailabilityException`

Lưu sự kiện tạm thời thay đổi khả năng nhận lead:

- `id`, `workspaceId`, `workspaceMemberId`
- `type`: `UNEXPECTED_LEAVE`, `TEMPORARY_UNAVAILABLE`, `OVERTIME_CONSENT`
- `startsAt`, `endsAt` (`endsAt` có thể rỗng nếu chưa rõ ngày quay lại)
- `status`: `PENDING`, `APPROVED`, `ACTIVE`, `ENDED`, `CANCELLED`
- `reasonCode`, ghi chú tối thiểu cần thiết
- `requestedById`, `approvedById`, `createdAt`, `updatedAt`
- Với ca ngoài: thời gian cụ thể, phạm vi/ca nhận, xác nhận rõ của nhân viên và thời điểm xác nhận.

Owner/ca trưởng ghi nhận nghỉ đột xuất và quyết định bàn giao; không tự suy đoán lý do bệnh từ dữ liệu nhạy cảm. Chỉ lưu lý do tối thiểu phục vụ vận hành.

### 4.4 Hàng chờ phân công

Conversation chưa được gán vẫn giữ `assignedMemberId = null`. Bổ sung metadata hàng chờ (trên bảng riêng hoặc mở rộng Conversation theo quyết định kỹ thuật):

- `workspaceId`, `conversationId`, `status`: `WAITING`, `ASSIGNED`, `CANCELLED`
- `queuedAt`, `reason`: `NO_CAPACITY`, `NO_ACTIVE_SHIFT`, `UNEXPECTED_LEAVE`, `HANDOVER_REQUIRED`
- `priority`, `slaDueAt`, `lastEscalatedAt`, `escalationLevel`
- `assignedAt`, `assignedById`, `resolvedAt`
- Idempotency key/event reference để retry không tạo hàng chờ trùng.

Không tạo hai nguồn sự thật: assignee chính thức vẫn là `Conversation.assignedMemberId`; queue record chỉ quản lý tình trạng chờ/escalation.

### 4.5 Assignment history và audit log

Lưu lịch sử assignment riêng hoặc dùng event log đủ cấu trúc:

- conversation, assignee cũ/mới, actor, thời điểm, lý do, nguồn (`MANUAL`, `AUTO`, `HANDOVER`, `OVERTIME`), vượt hạn mức hay không.

Audit tổng quát ghi `workspaceId`, `actorId`, `action`, `entityType`, `entityId`, `occurredAt`, `before`, `after`, `reason`, `source`, `requestId/correlationId`. Log chỉ được thêm mới; không cho CRUD sửa/xóa qua API/UI thông thường.

## 5. Luồng tự động phân lead

1. Nhận và lưu inbound message/hội thoại theo luồng hiện tại trước khi chạy phân công.
2. Xác định workspace và conversation; kiểm tra idempotency để một hội thoại chỉ được auto-assign một lần.
3. Nếu đã có assignee, giữ nguyên; tin tiếp theo không tạo lượt lead mới.
4. Tập hợp các ca hoạt động theo timezone workspace và hợp nhất thành viên trùng nhau.
5. Tính sức chứa hiệu dụng của từng nhân viên: tổng hạn mức các ca của họ đang chạy; cộng ca ngoài nếu có xác nhận còn hiệu lực.
6. Lọc theo membership, khóa, ngoại lệ nghỉ và số conversation OPEN hiện tại.
7. Chọn người có tỷ lệ `openConversationCount / effectiveCapacity` thấp nhất; phá hòa theo round-robin có trạng thái bền vững.
8. Trong transaction/khóa phù hợp, kiểm tra lại sức chứa và ghi assignment + assignment history + audit. Nếu xung đột, retry chọn ứng viên tiếp.
9. Phát sự kiện Realtime sau khi commit để Inbox và danh sách thành viên cập nhật.
10. Nếu không có người hợp lệ hoặc không còn chỗ, tạo queue entry và kích hoạt SLA/escalation.

Assignment thủ công của Owner vẫn đi qua kiểm tra workspace và ghi audit. Nếu vượt hạn mức, API trả thông tin `overCapacity=true` và giới hạn hiện tại; UI thông báo trung tính rồi cho Owner xác nhận tiếp tục. Không dùng thông báo nguy hiểm.

## 6. Nghỉ đột xuất, bàn giao, khóa và thôi việc

### 6.1 Nghỉ đột xuất

1. Owner/ca trưởng đánh dấu nhân viên vắng mặt; trạng thái có hiệu lực ngay, dừng nhận lead mới.
2. Hệ thống hiển thị danh sách hội thoại OPEN, tuổi lead, lịch hẹn và mức ưu tiên để Owner quyết định.
3. Owner/ca trưởng chọn một trong hai hướng:
   - **Chuyển ngay:** chọn người/ca nhận, xem trước số lượng, xác nhận; có thể chuyển hàng loạt.
   - **Đưa vào hàng chờ đội:** assignee được gỡ, queue nhận lead; nhân viên đang trực có quyền claim/Owner phân công.
4. Không tự động chuyển nếu chưa có chính sách/người nhận đã cấu hình. Mọi lần chuyển đều giữ assignment history.

### 6.2 Hết ca

- Hết ca dừng phân lead mới theo hạn mức/ca.
- Conversation đã gán không bị đóng hoặc tự chuyển.
- Nhân viên ngoài ca chỉ được tiếp tục tư vấn nếu có xác nhận ca ngoài còn hiệu lực. Nếu không, Owner/ca trưởng bàn giao các lead cần tiếp tục.
- Ca ngoài không tự động phát sinh từ tình trạng quá tải; cần xác nhận rõ của nhân viên và người có quyền.

### 6.3 Khóa hoặc gỡ khỏi ca

- Khóa tài khoản hoặc membership: chặn nhận lead mới ngay.
- Gỡ khỏi một ca: chặn nhận lead từ ca đó; không xóa conversation đã gán.
- Owner chọn giữ trong hàng chờ đội hay chuyển ngay khi nhân viên bị khóa. Nếu khóa khẩn cấp, khóa truy cập trước rồi đưa conversation vào chế độ handover để đội/Owner xử lý.

### 6.4 Thôi việc/offboarding

- Không cho hoàn tất xóa/gỡ membership nếu còn conversation OPEN chưa có kế hoạch bàn giao.
- UI hiển thị preview và cho chuyển sang một hay nhiều nhân viên/ca, có cảnh báo trung tính khi vượt hạn mức.
- Khi Owner xác nhận, thực hiện bàn giao có transaction/idempotency và ghi assignment history/audit.
- Sau khi không còn conversation cần bàn giao, hoàn tất khóa/gỡ thành viên.
- Lối khẩn cấp cho phép khóa đăng nhập ngay; dữ liệu CRM vẫn bảo toàn, lead vào hàng chờ đội hoặc được Owner chuyển tiếp.

## 7. Hàng chờ quá tải và SLA trong CRM

Hàng chờ chung có quyền truy cập theo workspace cho Owner/ca trưởng và nhân viên đang được chỉ định xử lý. Nếu hiện tại staff chỉ xem được conversation của mình, cần bổ sung quyền đọc/claim hạn chế cho hàng chờ để lead không bị vô hình với đội.

### Mặc định đề xuất (có thể cấu hình theo workspace)

- **T=0:** tạo thông báo CRM ngay cho Owner và người trực/ca trưởng được cấu hình; lead xuất hiện trong hàng chờ.
- **T=5 phút chưa nhận:** nhắc lại cho nhóm trực; tăng thứ tự ưu tiên.
- **T=15 phút:** escalation level 2, đưa lên đầu hàng chờ, thông báo Owner/ca trưởng.
- **T=30 phút:** đánh dấu quá SLA, hiển thị nổi bật trên dashboard và tạo nhắc cần xử lý cho Owner.

SLA có thể khác theo priority. Tin được gắn khẩn cấp dùng SLA ngắn hơn do workspace cấu hình; mặc định nếu chưa có phân loại thì áp dụng mức chung. Thông báo được deduplicate theo queue entry + escalation level để tránh spam. Chỉ dùng notification trong CRM giai đoạn đầu; UI phải hiển thị `chưa xác nhận` vì người nhận có thể offline.

Không tự giao vượt hạn mức hoặc bắt nhân viên làm ngoài ca khi quá tải. Hướng giải quyết là hàng chờ, người trực dự phòng, Owner/ca trưởng phân công, hoặc ca ngoài có đồng ý.

## 8. API dự kiến

Tên route để dev điều chỉnh theo conventions hiện tại:

| Method | Route đề xuất | Quyền | Tác vụ |
|---|---|---|---|
| `GET/POST` | `/api/workspaces/current/shifts` | đọc / Owner ghi | Danh sách và tạo ca |
| `PATCH/DELETE` | `/api/workspaces/current/shifts/:id` | Owner | Sửa, tắt; DELETE chỉ cho ca chưa từng dùng nếu chính sách cho phép, nếu đã dùng trả 409 và yêu cầu tắt |
| `PUT` | `/api/workspaces/current/shifts/:id/members` | Owner | Cập nhật thành viên và hạn mức |
| `POST` | `/api/workspaces/current/staff/:id/availability-exceptions` | Owner/ca trưởng; nhân viên báo nghỉ theo policy | Báo nghỉ/ca ngoài |
| `POST` | `/api/workspaces/current/conversations/:id/claim` | Staff đủ điều kiện | Claim từ hàng chờ, atomic và kiểm tra capacity |
| `POST` | `/api/workspaces/current/conversations/:id/handover` | Owner/ca trưởng | Chuyển người/đưa hàng chờ |
| `GET` | `/api/workspaces/current/lead-queue` | Owner/ca trưởng/Staff được phép | Hàng chờ, SLA và trạng thái escalation |
| `GET` | `/api/workspaces/current/audit` | Owner/auditor | Lọc/xem audit; read-only |

Các route phải xác thực workspace từ request context, role, member status và quan hệ Conversation–Workspace. Không tin member/workspace IDs do client gửi mà chưa kiểm tra.

## 9. Giao diện

### Cài đặt ca

- Tạo/sửa/tắt ca; giờ qua đêm, weekdays, timezone.
- Thành viên và hạn mức theo từng ca.
- Cho phép ca chồng; cảnh báo xem trước sức chứa cộng dồn của nhân viên.
- Xem ai đang được cấu hình làm Owner/ca trưởng nhận escalation.

### Danh sách thành viên

- Ca hiện tại, Online/không nhận lead, nghỉ đột xuất, bị khóa.
- Hạn mức hiệu dụng, số hội thoại mở và chỗ còn lại.
- Thao tác Owner/ca trưởng: đánh dấu nghỉ, chuyển lead, kết thúc vắng mặt.
- Kết nối WebSocket nếu có hiển thị riêng, không nhập chung với trạng thái đi ca.

### Hàng chờ và Inbox

- Lead chưa phân công, lý do, thời gian chờ, SLA, priority, lịch sử thông báo.
- Claim/chuyển/gán thủ công theo quyền.
- Cảnh báo Owner vượt hạn mức theo dạng thông tin và xác nhận.
- Bảng bàn giao hàng loạt có preview, bộ lọc theo ca/người nghỉ/trạng thái hội thoại.

### Audit

- Lọc theo thời gian, actor, nhân viên, hội thoại, ca, hành động.
- Xem before/after, lý do, nguồn tự động/thủ công.
- Xuất CSV nếu phù hợp quyền và chính sách dữ liệu.

## 10. Phân quyền

- **Owner:** cấu hình ca/hạn mức, quản lý người nhận escalation, ghi nhận ngoại lệ, chuyển lead, xử lý offboarding, xem audit.
- **Ca trưởng** (nếu workspace bật vai trò này): xử lý nghỉ đột xuất và bàn giao trong phạm vi được giao. Nếu hệ thống chưa có role này, triển khai ban đầu bằng danh sách `shiftManagers` cấu hình theo workspace, không mở rộng role toàn cục ngoài phạm vi.
- **Staff:** đọc trạng thái cần thiết; claim hàng chờ nếu được phép và còn capacity; xác nhận/không xác nhận ca ngoài; không thay đổi cấu hình ca hoặc audit.

## 11. Audit và minh bạch

Các event bắt buộc:

- `SHIFT_CREATED`, `SHIFT_UPDATED`, `SHIFT_DEACTIVATED`, `SHIFT_MEMBER_ADDED/REMOVED`, `SHIFT_CAPACITY_CHANGED`.
- `STAFF_ABSENCE_RECORDED/ENDED`, `OVERTIME_OFFERED/ACCEPTED/DECLINED/CANCELLED`.
- `STAFF_LOCKED/UNLOCKED`, `MEMBERSHIP_DEACTIVATED`, `OFFBOARDING_STARTED/COMPLETED`.
- `LEAD_AUTO_ASSIGNED`, `LEAD_MANUALLY_ASSIGNED`, `LEAD_CLAIMED`, `LEAD_HANDED_OVER`, `LEAD_QUEUED`, `LEAD_ESCALATED`, `LEAD_CLOSED`.

Mỗi event ghi workspace, actor (hoặc SYSTEM), timestamp UTC, before/after, lý do, nguồn, conversation/member/shift liên quan, correlation ID và cờ over-capacity. Không ghi nội dung tin nhắn hoặc thông tin sức khỏe chi tiết vào audit. Log bất biến ở cấp ứng dụng; xác định retention theo chính sách bảo vệ dữ liệu của hệ thống.

## 12. Độ tin cậy và an toàn xử lý

- Inbound phải lưu bền vững trước khi auto-assign; lỗi phân công không làm mất tin.
- Queue worker retry idempotent; unique constraint chống queue/assignment trùng.
- Capacity count và assignment được kiểm tra trong một transaction/chiến lược khóa có retry để tránh hai worker vượt hạn mức.
- Tạo notification theo outbox hoặc cơ chế bền vững tương đương để lỗi Redis không làm mất escalation.
- Khi đổi lịch/hạn mức/absence, trigger đánh giá lại hàng chờ; không cần chờ tin inbound tiếp theo.
- Khi hết ca làm giảm capacity, không tự thu hồi assignment; chỉ chặn assign mới.
- Dùng UTC trong audit và instant; tính lịch bằng timezone IANA của workspace, tránh sai DST nếu workspace ngoài Việt Nam.

## 13. Tiêu chí nghiệm thu

1. CRUD ca đúng quyền; ca đã dùng tắt được nhưng không xóa vật lý.
2. Ca qua đêm, weekdays, timezone và overlap được tính đúng.
3. Overlap cộng capacity, đếm open conversations một lần; tại boundary không auto-transfer lead cũ.
4. Nhân viên chỉ nhận lead khi có ca/ca ngoài đồng ý và không bị nghỉ, khóa hoặc vô hiệu hóa.
5. Owner gán vượt hạn mức thấy cảnh báo thông tin và có thể xác nhận tiếp tục.
6. Tin mới ở conversation có assignee không bị auto-assign lại.
7. Không có capacity thì lead vào queue, vẫn được lưu và nhìn thấy bởi đội có quyền.
8. SLA CRM T=0/5/15/30 nhắc đúng, escalation deduplicate và hiển thị chưa xác nhận.
9. Nghỉ đột xuất có thể bàn giao hàng loạt hoặc đưa queue; audit giữ chuỗi chủ sở hữu.
10. Hết ca không tự chuyển lead; ngoài ca chỉ thao tác theo consent còn hiệu lực.
11. Offboarding không hoàn tất khi còn lead cần bàn giao, trừ luồng khóa khẩn cấp có queue fallback.
12. Mọi thao tác ca, capacity, nghỉ, khóa, assignment, handover và escalation có audit before/after.
13. Nhiều inbound/claim đồng thời không tạo assignment trùng hoặc vượt hạn mức tự động.
14. Không thể truy cập queue/audit/conversation chéo workspace.

## 14. Phân rã triển khai đề xuất

1. **Nền dữ liệu:** Prisma schema, migrations, audit/event structures, indexes.
2. **Domain rules:** shift evaluator, effective capacity, exceptions, overtime consent.
3. **Assignment engine:** idempotency, atomic capacity check, round-robin tie-break, queue.
4. **Handover/offboarding:** absence, batch transfer, team queue, emergency lock path.
5. **Notification/SLA:** CRM alerts, escalation state, deduplication, dashboard.
6. **API/RBAC:** owner/shift-manager/staff scopes, workspace isolation.
7. **Web UI:** ca, member roster, queue, handover, consent, audit viewer.
8. **Integration/verification:** inbound worker, realtime events, race conditions, timezone, audit completeness.

## 15. Ghi chú pháp lý cho làm ngoài ca

Hệ thống phải yêu cầu và lưu xác nhận rõ của nhân viên trước khi bật quyền làm ngoài lịch; không tự phát sinh ca ngoài do quá tải. Đây là yêu cầu thiết kế vận hành, không thay thế việc đơn vị rà soát quy định lao động áp dụng cho loại hình và lịch làm cụ thể. Bộ luật Lao động 2019 quy định nguyên tắc làm thêm giờ cần có sự đồng ý của người lao động và các giới hạn liên quan; team cần phối hợp bộ phận nhân sự/pháp chế khi cấu hình chính sách thực tế. [Văn bản Bộ luật Lao động trên Cổng văn bản Chính phủ](https://vanban.chinhphu.vn/?classid=1&docid=198540&pageid=27160&typegroupid=3).

## 16. File hiện trạng tham chiếu

- `apps/api/prisma/schema/workspace.prisma`
- `apps/api/prisma/schema/messaging.prisma`
- `apps/api/src/modules/realtime/realtime.service.ts`
- `apps/api/src/modules/messaging/application/inbound-message-side-effects.service.ts`
- `apps/api/src/modules/messaging/application/customer.service.ts`
- `apps/api/src/modules/messaging/presentation/customer.controller.ts`
- `apps/api/src/modules/workspace-config/presentation/controllers/staff-management.controller.ts`
