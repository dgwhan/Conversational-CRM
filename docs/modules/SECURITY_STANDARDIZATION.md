# BÁO CÁO CHUẨN HÓA KỸ THUẬT VỀ BẢO MẬT HỆ THỐNG
**Dự án:** CUSC Recruitment CRM  
**Phiên bản tài liệu:** 1.0  
**Ngày cập nhật:** 11/11/2026  
**Trạng thái:** Đã kiểm thử và chuẩn hóa kỹ thuật  

---

## 1. TỔNG QUAN KIẾN TRÚC BẢO MẬT (DEFENSE-IN-DEPTH)

Hệ thống **CUSC Recruitment CRM** được xây dựng theo chiến lược **Phòng thủ Đa tầng (Defense-in-Depth)**, bao gồm 7 lớp bảo vệ liên kết chặt chẽ từ tầng Mạng, Cổng API, Xác thực/Phân quyền, Dữ liệu, Tích hợp kênh ngoài cho đến Nhật ký kiểm toán.

```
+-------------------------------------------------------------------------+
| [TẦNG 1] NETWORK & HEADERS: OWASP Security Headers, CORS, CSRF, DDoS    |
+-------------------------------------------------------------------------+
| [TẦNG 2] AUTHENTICATION: Argon2id, Account Lockout, JWT Rotation, OTP   |
+-------------------------------------------------------------------------+
| [TẦNG 3] AUTHORIZATION & TENANCY: Workspace Isolation, RBAC (OWNER/STAFF)|
+-------------------------------------------------------------------------+
| [TẦNG 4] INPUT & INJECTION DEFENSE: XssSanitizer, Zod, Prisma ORM       |
+-------------------------------------------------------------------------+
| [TẦNG 5] WEBHOOK & 3RD-PARTY: HMAC SHA-256, Anti-Retry Storm, Rate-Limit|
+-------------------------------------------------------------------------+
| [TẦNG 6] ERROR HANDLING: AllExceptionsFilter, Anti-Information Leak     |
+-------------------------------------------------------------------------+
| [TẦNG 7] AUDIT & MONITORING: Audit Logging, Trace ID, Activity Timeline |
+-------------------------------------------------------------------------+
```

---

## 2. CHI TIẾT CÁC LỚP BẢO MẬT ĐÃ THỰC THI

### 2.1. Tầng 1: Mạng, Cổng API & HTTP Security Headers

#### A. Bộ HTTP Security Headers Chuẩn OWASP
Hệ thống sử dụng [`SecurityHeadersInterceptor`](file:///apps/api/src/common/security/security-headers.interceptor.ts) áp dụng cho 100% request qua NestFastify:
- **`Content-Security-Policy (CSP)`**: Giới hạn nguồn tài nguyên:
  `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' ws: wss: http: https:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'`
- **`X-Content-Type-Options: nosniff`**: Chống tấn công MIME-sniffing (ngăn trình duyệt tự ý thực thi file text/ảnh thành script).
- **`X-Frame-Options: SAMEORIGIN`**: Ngăn chặn nhúng hệ thống vào `<iframe>` độc hại từ bên ngoài, miễn dịch hoàn toàn với tấn công **Clickjacking**.
- **`X-XSS-Protection: 1; mode=block`**: Kích hoạt bộ lọc chống XSS phản xạ ở trình duyệt cũ.
- **`Referrer-Policy: strict-origin-when-cross-origin`**: Bảo vệ URL nội bộ không bị rò rỉ khi người dùng chuyển tiếp sang link ngoài.
- **`Permissions-Policy: camera=(), microphone=(), geolocation=()`**: Vô hiệu hóa triệt để các API phần cứng không được cấp phép.

#### B. Kiểm Soát CORS Nghiêm Ngặt
Trong [`main.ts`](file:///apps/api/src/main.ts):
- Phân tích và nạp whitelist từ biến môi trường `FRONTEND_URL`.
- **Tuyệt đối không dùng `origin: true` hay `*`**: Chỉ cho phép danh sách tên miền tin cậy thực tế (ví dụ: `http://localhost:5173`, domain production).
- Hỗ trợ đầy đủ `credentials: true` để truyền nhận token an toàn.

#### C. Chống Tấn Công Giả Mạo Yêu Cầu (CSRF Protection)
Triển khai tại [`CsrfGuard`](file:///apps/api/src/common/guards/csrf.guard.ts):
- Các phương thức an toàn (`GET`, `HEAD`, `OPTIONS`) được cho phép theo chuẩn RFC 7231.
- Đối với các phương thức thay đổi dữ liệu (`POST`, `PUT`, `PATCH`, `DELETE`):
  - Bắt buộc kiểm tra khớp `Origin` hoặc `Referer` với cấu hình máy chủ.
  - Trường hợp không có Origin/Referer (client API/mobile): Bắt buộc kiểm tra sự hiện diện của **Custom Security Header** (`Authorization`, `x-workspace-id`, `x-requested-with`...). Trình duyệt web độc hại không thể tự động đính kèm các header này trong các form HTML cross-site.
  - Sử dụng decorator `@SkipCsrf()` có chủ đích để miễn trừ các endpoint Webhook từ Meta và Zalo.

#### D. Chống Tấn Công Từ Chối Dịch Vụ & Dò Quét (Rate Limiting)
Triển khai tại [`RateLimiterService`](file:///apps/api/src/common/security/rate-limiter.service.ts) và [`RateLimitGuard`](file:///apps/api/src/common/guards/rate-limit.guard.ts):
- **Thuật toán**: Sliding Window Log In-Memory, độ phức tạp $O(1)$ amortized.
- Tự động xóa dọn bản ghi IP hết hạn định kỳ mỗi 60 giây để chống rò rỉ bộ nhớ (Memory Leak).
- Mặc định giới hạn 120 requests/phút trên mỗi Client IP, tự động trả HTTP 429 Too Many Requests kèm header `Retry-After`.

---

### 2.2. Tầng 2: Xác Thực & Bảo Vệ Tài Khoản Người Dùng (Authentication)

#### A. Mã Hóa Mật Khẩu Chuẩn Quốc Tế
- Hệ thống hỗ trợ thuật toán băm mật khẩu hiện đại nhất **Argon2id** (đạt giải Password Hashing Competition) và **Bcrypt** với Salt Rounds ngẫu nhiên độc lập cho từng người dùng.
- Không lưu trữ mật khẩu dưới dạng plaintext trong bất kỳ hoàn cảnh nào.

#### B. Cơ Chế Khóa Tài Khoản Tự Động (Account Lockout)
Để ngăn chặn tấn công **Brute-force / Credential Stuffing**:
- Bảng `users` duy trì trường `failedLoginAttempts`, `isLocked`, `lockedUntil`, `status`.
- Nếu đăng nhập sai quá số lần cho phép (ngưỡng 5 lần liên tiếp):
  - Hệ thống tự động chuyển trạng thái `status: LOCKED` hoặc đặt khóa thời gian `lockedUntil`.
  - Phản hồi từ chối đăng nhập và ghi log kiểm toán bảo mật.
  - Reset bộ đếm số lần thất bại ngay khi đăng nhập thành công.

#### C. Quản Lý Phiên & JWT Rotation
- Cặp Token: **Access Token** (thời hạn ngắn: 15-30 phút) và **Refresh Token** (thời hạn dài hơn).
- Module Auth hỗ trợ bộ phân tích `JwtTtlParser` kiểm soát chặt chẽ định dạng TTL.
- Quản lý trạng thái Refresh Token trong cơ sở dữ liệu (`refresh_tokens`): Hỗ trợ thu hồi token (`revoked: true`), phát hiện hành vi tái sử dụng token bị đánh cắp (Token Reuse Detection) và đăng xuất khỏi toàn bộ thiết bị.

#### D. Quy Trình Khôi Phục Mật Khẩu An Toàn (Forgot Password Flow)
Triển khai độc lập tại [`PasswordRecoveryModule`](file:///apps/api/src/modules/password-recovery/):
- **Rate-limit Đa Cấp**: Giới hạn theo IP yêu cầu (`IP_REQUEST`), theo Email (`EMAIL_REQUEST`), theo lượt gửi (`EMAIL_SEND`) và theo IP xác minh (`IP_VERIFY`) thông qua bảng `password_recovery_rate_limit_buckets`.
- Mã OTP / Verification Code được sinh ngẫu nhiên với độ entropy cao, thời gian sống ngắn (3–5 phút).
- Thử sai mã OTP quá 3 lần: Thách thức (`challenge`) lập tức bị chuyển sang trạng thái `LOCKED` và vô hiệu hóa hoàn toàn.

---

### 2.3. Tầng 3: Phân Quyền & Cô Lập Dữ Liệu Đa Khách Thuê (Multi-Tenancy & Authorization)

#### A. Xác Thực Mặc Định & Cô Lập Dữ Liệu Theo Workspace (Multi-Tenant Isolation)
**Cơ chế đã thực thi (deny-by-default):**
- [`JwtAuthGuard`](file:///apps/api/src/modules/auth/presentation/guards/jwt-auth.guard.ts) được đăng ký toàn cục (`APP_GUARD`). Mọi route đều yêu cầu Access Token hợp lệ, trừ các route gắn `@Public()` ([`public.decorator.ts`](file:///apps/api/src/common/decorators/public.decorator.ts)): health check, đăng nhập/đăng ký/refresh/logout, khôi phục mật khẩu, webhook kênh (tự xác thực bằng chữ ký) và tải mẫu import.
- [`WorkspaceContextGuard`](file:///apps/api/src/common/guards/workspace-context.guard.ts) chạy ngay sau đó: xác định workspace đang thao tác và **kiểm tra người dùng là thành viên ACTIVE từ CSDL** (`workspaces.owner_id` / `workspace_members`). `workspaceId` do client chỉ định (param `wsId`/`workspaceId`, query, body) mà người dùng không thuộc về sẽ bị `403`. Header `x-workspace-id` không hợp lệ bị bỏ qua và dùng workspace mặc định của người dùng.
- Vai trò (`OWNER`/`STAFF`) **chỉ lấy từ CSDL** và gắn vào `request.workspace`. Các header `x-user-role`, `x-member-status`, `x-staff-id`, `x-owner-id`, `x-actor-id` do client gửi lên bị ghi đè bằng giá trị đã xác minh; không còn mặc định `OWNER` khi thiếu thông tin.
- Controller đọc danh tính qua [`getRequestIdentity` / `requireWorkspaceId`](file:///apps/api/src/common/auth/request-identity.ts). Các endpoint theo `:id` (khách hàng, deal, hoạt động, luật từ khóa, ...) kiểm tra bản ghi thuộc đúng workspace; bản ghi của workspace khác được trả `404` như không tồn tại.
- Token không chứa claim `role`; không suy luận vai trò từ token.
- Webhook inbound được định tuyến tenant bằng `ChannelAccount (channel, externalAccountId) -> workspaceId`; truy vấn khách hàng khi nhận tin luôn kèm `workspaceId`.

**Giới hạn đã biết (cần xử lý tiếp, không nên xem là "cô lập tuyệt đối"):**
- Các bảng `contacts`, `channel_identities`, `contact_merge_logs` hiện **chưa có cột `workspace_id`** (số điện thoại chuẩn hóa là unique toàn hệ thống) nên `/contacts/*` mới được bảo vệ bằng xác thực chứ chưa cô lập theo tenant. Cần migration thêm `workspace_id` để khép kín.
- Kết nối realtime (SSE/WebSocket) không bị kiểm tra lại tư cách thành viên sau khi đã mở; ticket chỉ hiệu lực 60 giây cho lần kết nối đầu.
- `OwnerController` (`owner/*`) vẫn chưa được kích hoạt/rà soát phân quyền xuyên tenant; không bật trước khi rà soát.

#### B. Phân Quyền Theo Vai Trò (RBAC - Role-Based Access Control)
Vai trò được xác định phía máy chủ từ tư cách thành viên đã xác minh ([`WorkspaceRolesGuard`](file:///apps/api/src/common/guards/workspace-roles.guard.ts) không còn tin header `x-user-role`). Hệ thống chuẩn hóa 2 nhóm vai trò trong Workspace:
1. **`OWNER` (Chủ sở hữu / Trưởng ban Tuyển sinh)**:
   - Toàn quyền cấu hình Workspace, kết nối kênh, quản trị nhân sự, gán quyền, xem toàn bộ dữ liệu báo cáo và hội thoại.
2. **`STAFF` (Tư vấn viên / Nhân viên tuyển sinh)**:
   - **Hạn chế phạm vi truy cập**: Chỉ được xem và phản hồi các cuộc hội thoại và khách hàng **được phân công cho chính mình**.
   - **Chống can thiệp chéo**: Cố gắng xem hoặc sửa khách hàng của người khác sẽ nhận ngay lỗi `403 Forbidden`.
   - **Chống tự ý phân công**: Nhân viên không có quyền phân công khách hàng/hội thoại cho nhân sự khác (bị chặn tại [`CustomerController.assignConversation`](file:///apps/api/src/modules/messaging/presentation/customer.controller.ts#L101-L115)).

---

### 2.4. Tầng 4: Làm Sạch Dữ Liệu & Phòng Chống Injection (Sanitization)

#### A. Miễn Dịch Tuyệt Đối Với SQL Injection
- 100% các truy vấn cơ sở dữ liệu được thực hiện thông qua **Prisma ORM** với Parameterized Queries (Truy vấn tham số hóa).
- Ngăn chặn việc nối chuỗi câu lệnh SQL thô ở mọi điểm tiếp nhận dữ liệu.

#### B. Làm Sạch Dữ Liệu Đầu Vào Chống XSS ([`XssSanitizerPipe`](file:///apps/api/src/common/pipes/xss-sanitizer.pipe.ts))
Được đăng ký làm Global Pipe của ứng dụng:
- Đệ quy duyệt qua mọi mảng và đối tượng trong Request Body, Query, Params.
- **Loại bỏ thẻ thực thi mã độc**: Cắt bỏ hoàn toàn `<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`.
- **Vô hiệu hóa Pseudo-Protocols**: Chuyển `javascript:`, `vbscript:`, `data:text/html:` thành `blocked:`.
- **Khử Event Listeners**: Loại bỏ tất cả thuộc tính inline nguy hiểm: `onerror=`, `onload=`, `onclick=`, `onmouseover=`.
- **Whitelisting an toàn**: Tự động bỏ qua các trường nhạy cảm cần giữ nguyên dạng (`password`, `token`, `secret`, `rawBody`, `signature`).

#### C. Kiểm Thực Đầu Vào Chặt Chẽ (Zod & UUID Validation)
- Mọi định danh truyền trên URL đều được kiểm tra bằng regex chuẩn `isUuid()`. Mọi chuỗi bất thường (chứa ký tự lạ, toán tử SQL, path traversal) đều bị loại bỏ ngay từ tầng Presentation.
- Toàn bộ DTO đầu vào được kiểm thực cấu trúc, kiểu dữ liệu và độ dài bằng thư viện **Zod Schema**.

---

### 2.5. Tầng 5: Bảo Mật Tích Hợp Kênh Ngoại Vi (Webhooks & Social Channels)

#### A. Xác Thực Chữ Ký Webhook Meta (Facebook)
Trong [`FacebookAdapter.verifyRequest`](file:///apps/api/src/modules/messaging/infrastructure/adapters/facebook.adapter.ts):
- Kiểm tra header `X-Hub-Signature-256`.
- Sử dụng thuật toán mã hóa `crypto.createHmac('sha256', appSecret)` trên `rawBody` (nguyên bản byte gốc được Fastify bảo toàn).
- So sánh an toàn bằng hàm chống tấn công phân tích thời gian (Timing-safe comparison `crypto.timingSafeEqual`).
- Nếu chữ ký giả mạo hoặc sai lệch: Từ chối ngay lập tức với mã lỗi `401 Unauthorized`.

#### B. Cơ Chế Chống Treo Máy & Vòng Lặp Retry Của Meta (Anti-Retry Storm)
Trong [`WebhookController.handle`](file:///apps/api/src/modules/messaging/presentation/webhook.controller.ts#L85-L115):
- Quy định của Meta: Webhook phải phản hồi `200 OK` trong vòng dưới 3 giây, nếu không Meta sẽ xem như thất bại và gửi lại tin nhắn liên tục (tạo bão request làm sập hệ thống).
- Hệ thống áp dụng **Timeout Guard 2500ms** bằng `Promise.race()`: Nếu cơ sở dữ liệu bận, server vẫn chủ động phản hồi 200 OK trước cho Meta, sau đó đưa tiến trình vào hàng đợi BullMQ để xử lý ngầm an toàn.

#### C. Bảo Vệ Tài Khoản Zalo Cá Nhân (`zca-js`)
- Dịch vụ [`ZcaPersonalService`](file:///apps/api/src/modules/channel-connection/application/zca-personal.service.ts) tích hợp cơ chế:
  - **Rate Limiting & Safety Guard**: Kiểm soát số lượng và khoảng cách gửi tin nhắn giữa các cuộc gọi để tránh bị hệ thống Zalo đánh dấu là bot/spam và khóa tài khoản.
  - **Session Expiration Guard**: Phát hiện phiên đăng nhập QR hết hạn và cảnh báo người dùng kết nối lại an toàn.

---

### 2.6. Tầng 6: Xử Lý Ngoại Lệ & Chống Tiết Lộ Thông Tin (Error Shielding)

Triển khai tại [`AllExceptionsFilter`](file:///apps/api/src/common/filters/all-exceptions.filter.ts):
- Bắt và chuẩn hóa toàn bộ lỗi trong hệ sinh thái ứng dụng.
- **Che giấu lỗi hệ thống ở Production**: Trong môi trường production, người dùng bên ngoài chỉ nhìn thấy thông báo lỗi chuẩn hóa thân thiện, tuyệt đối không bao giờ nhận được Database Error, Connection String hay Stack Trace kỹ thuật.
- **Bắt và chuẩn hóa lỗi Prisma**:
  - `P2002`: Unique Constraint (Trùng lặp dữ liệu) → `409 Conflict`.
  - `P2025`: Record Not Found → `404 Not Found`.
  - `P2003`: Foreign Key Violation → `400 Bad Request`.
  - `P2022`: Column Missing (Lỗi cấu trúc CSDL) → `400 Bad Request`.
- **Ghi log an toàn nội bộ**: Đầy đủ Client IP, Phương thức HTTP, Route, Trace ID và chi tiết ngoại lệ trên Console server phục vụ việc khắc phục sự cố mà không để lộ ra ngoài.

---

### 2.7. Tầng 7: Nhật Ký Kiểm Toán & Giám Sát (Audit Logging & Compliance)

#### A. Bảng Cơ Sở Dữ Liệu `audit_logs`
Ghi nhận toàn bộ các sự kiện quan trọng trong hệ thống với các trường:
- `userId`: Người thực hiện hành động.
- `action`: Định danh hành vi (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `ROLE_CHANGED`, `CONTACT_MERGED`, `CUSTOMER_MERGED`...).
- `ipAddress`: Địa chỉ IP của client gọi request.
- `userAgent`: Trình duyệt / Thiết bị thực hiện.
- `details` (JSONB): Thông tin trước và sau khi thay đổi (diff) để phục vụ thanh tra.

#### B. Trace ID Toàn Vòng Đời Yêu Cầu
Mỗi HTTP Request được gắn kèm một mã định danh duy nhất (`traceId` / `x-request-id`). Mã này được lưu xuyên suốt từ Client → API Gateway → Log Server → Response Headers, giúp truy vết chính xác nguồn gốc lỗi hoặc các hành vi bất thường.

---

### 2.8. Tầng 8: Webhook Zalo, Media Proxy & Realtime

#### A. Xác Thực Chữ Ký Webhook Zalo OA
Trong [`ZaloAdapter.verifyRequest`](file:///apps/api/src/modules/messaging/infrastructure/adapters/zalo.adapter.ts):
- Khi đã cấu hình `ZALO_OA_SECRET_KEY` (hoặc `ZALO_APP_SECRET`), **bắt buộc có chữ ký hợp lệ**: `X-ZEvent-Signature` = sha256(`appId + rawBody + timestamp + secret`), hoặc HMAC-SHA256 trên `rawBody` (`x-hub-signature-256` / `x-zalo-signature`). So sánh bằng `timingSafeEqual`.
- Thiếu khóa bí mật: production từ chối mọi webhook; môi trường phát triển cho qua kèm cảnh báo.
- Kênh `MANUAL_IMPORT` không còn nhận qua webhook công khai; nhập thủ công đi qua `/messages/import` (có xác thực).

#### B. Media Proxy & Chống SSRF
[`MediaProxyController`](file:///apps/api/src/modules/messaging/presentation/media-proxy.controller.ts) yêu cầu đăng nhập và dùng [`safe-fetch`](file:///apps/api/src/common/security/safe-fetch.ts): phân giải DNS và chặn mọi dải IPv4/IPv6 nội bộ/dành riêng (kể cả IPv4-mapped), ghim kết nối vào IP đã kiểm tra (chống DNS-rebinding), chỉ cổng 80/443, redirect xử lý thủ công và kiểm tra lại từng chặng, stream có giới hạn dung lượng (`MEDIA_PROXY_MAX_BYTES`, mặc định 25MB), không còn `Access-Control-Allow-Origin: *`; chỉ hiển thị inline các kiểu ảnh/âm thanh/video/PDF an toàn, còn lại ép tải về. Có thể giới hạn thêm bằng `MEDIA_PROXY_ALLOWED_HOSTS`.

#### C. Realtime (SSE / WebSocket)
Trình duyệt không gửi được header `Authorization` cho `EventSource`/`WebSocket`, nên client gọi `POST /realtime/ticket` (có Access Token) để nhận ticket HMAC dùng **một lần**, sống 60 giây, gắn với (người dùng, workspace), rồi mở `/realtime/stream?ticket=...` hoặc `/api/realtime/ws?ticket=...`. Kết nối không có ticket hợp lệ bị từ chối ngay khi bắt tay. Sự kiện chỉ được phát cho client cùng workspace (sự kiện không có `workspaceId` không gửi cho ai); trạng thái hiện diện tách theo workspace. Các endpoint `simulate-inbound`, `pipeline-change`, `socket/test-ping`, `socket/test-client` chỉ tồn tại ngoài production và yêu cầu quyền OWNER (trừ trang test-client chỉ phục vụ phát triển).

## 3. DANH MỤC CÁC TỆP MÃ NGUỒN BẢO MẬT CHÍNH

| Thành phần bảo mật | Đường dẫn mã nguồn | Nhiệm vụ chính |
| :--- | :--- | :--- |
| **Security Headers** | `apps/api/src/common/security/security-headers.interceptor.ts` | Thiết lập CSP, Clickjacking, MIME Sniffing |
| **CSRF Defense** | `apps/api/src/common/guards/csrf.guard.ts` | Chặn tấn công Cross-Site Request Forgery |
| **Rate Limiter** | `apps/api/src/common/security/rate-limiter.service.ts` | Sliding window chống Brute-force & DoS |
| **XSS Sanitizer** | `apps/api/src/common/pipes/xss-sanitizer.pipe.ts` | Loại bỏ thẻ script, iframe, event độc hại |
| **Exception Shield** | `apps/api/src/common/filters/all-exceptions.filter.ts` | Chuẩn hóa lỗi, giấu stack trace nhạy cảm |
| **Role Guard** | `apps/api/src/common/guards/workspace-roles.guard.ts` | Kiểm soát quyền OWNER / STAFF từ tư cách thành viên đã xác minh |
| **Workspace Context Guard** | `apps/api/src/common/guards/workspace-context.guard.ts` | Xác minh thành viên workspace, ghi đè header danh tính |
| **SSRF Guard** | `apps/api/src/common/security/safe-fetch.ts` | Gọi HTTP ra ngoài an toàn (chặn IP nội bộ, DNS pinning) |
| **Meta Webhook Guard** | `apps/api/src/modules/messaging/infrastructure/adapters/facebook.adapter.ts` | Xác thực chữ ký HMAC SHA-256 |
| **Password Hashing** | `apps/api/src/modules/auth/` | Băm mật khẩu Argon2id / Bcrypt |
| **Audit Service** | `apps/api/src/modules/audit/` | Ghi vết nhật ký đăng nhập và đổi dữ liệu |

---

## 4. KẾT LUẬN & KHUYẾN NGHỊ VẬN HÀNH (PRODUCTION CHECKLIST)

1. **Khóa Bí Mật & Môi Trường**:
   - `NODE_ENV`, `JWT_ACCESS_SECRET`, `TOKEN_ENCRYPTION_KEY` là biến **bắt buộc** (không còn giá trị mặc định); khóa mẫu bị từ chối ở production. Bật Zalo ở production phải có `ZALO_OA_SECRET_KEY` hoặc `ZALO_APP_SECRET`.
   - Các biến `JWT_ACCESS_SECRET`, `TOKEN_ENCRYPTION_KEY`, `META_APP_SECRET`, `ZALO_APP_SECRET`, `DATABASE_URL` phải được lưu trữ trong trình quản lý Secret (Docker Secrets / Vault / Env an toàn), không được commit vào Git.
2. **Kích hoạt HTTPS / TLS**:
   - Ở môi trường triển khai thực tế, toàn bộ giao tiếp phải thông qua HTTPS (TLS 1.3) và WSS (Secure WebSocket) với cờ `Strict-Transport-Security (HSTS)` được bật trên Reverse Proxy (Nginx / Cloudflare).
3. **Sao lưu & Xoay vòng Khóa**:
   - Định kỳ kiểm tra nhật ký trong `audit_logs` để phát hiện các đợt quét IP bất thường.
   - Xoay vòng Secret Token của Facebook/Zalo định kỳ 6 tháng một lần.
