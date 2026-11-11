# Kiến trúc bảo mật — CUSC Recruitment CRM

**Phạm vi:** backend `apps/api` (NestJS + Fastify), cách web `apps/web` dùng token, hạ tầng Docker / Redis.
**Cập nhật:** 11/11/2026 — mô tả đúng mã nguồn hiện tại; mỗi mục kèm đường dẫn tệp để đối chiếu.

Tài liệu trả lời ba câu hỏi cho từng cơ chế: **chống lại điều gì**, **hoạt động thế nào** (từng bước, theo code) và **cấu hình / giới hạn**. Các điểm chưa làm được gom ở [mục 4](#4-giới-hạn-đã-biết-và-việc-cần-làm), không trộn vào phần mô tả.

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Vòng đời một request](#2-vòng-đời-một-request)
3. [Chi tiết từng cơ chế](#3-chi-tiết-từng-cơ-chế)
   - 3.1 [Cấu hình và khóa bí mật](#31-cấu-hình-và-khóa-bí-mật)
   - 3.2 [HTTP security headers và CORS](#32-http-security-headers-và-cors)
   - 3.3 [Rate limiting và xác định IP client](#33-rate-limiting-và-xác-định-ip-client)
   - 3.4 [Chống CSRF](#34-chống-csrf)
   - 3.5 [Mật khẩu và khóa tài khoản](#35-mật-khẩu-và-khóa-tài-khoản)
   - 3.6 [Access token (JWT)](#36-access-token-jwt)
   - 3.7 [Refresh token xoay vòng](#37-refresh-token-xoay-vòng)
   - 3.8 [Khôi phục mật khẩu bằng OTP](#38-khôi-phục-mật-khẩu-bằng-otp)
   - 3.9 [Cô lập workspace và phân quyền OWNER / STAFF](#39-cô-lập-workspace-và-phân-quyền-owner--staff)
   - 3.10 [Dữ liệu đầu vào: validation, SQL injection, XSS](#310-dữ-liệu-đầu-vào-validation-sql-injection-xss)
   - 3.11 [Webhook Facebook / Zalo](#311-webhook-facebook--zalo)
   - 3.12 [Mã hóa token kênh lưu trong DB](#312-mã-hóa-token-kênh-lưu-trong-db)
   - 3.13 [Media proxy và chống SSRF](#313-media-proxy-và-chống-ssrf)
   - 3.14 [Realtime: WebSocket / SSE](#314-realtime-websocket--sse)
   - 3.15 [Xử lý lỗi, chống lộ thông tin](#315-xử-lý-lỗi-chống-lộ-thông-tin)
   - 3.16 [Nhật ký kiểm toán](#316-nhật-ký-kiểm-toán)
   - 3.17 [Chạy nhiều instance an toàn](#317-chạy-nhiều-instance-an-toàn)
   - 3.18 [Dữ liệu seed và đóng gói Docker](#318-dữ-liệu-seed-và-đóng-gói-docker)
4. [Giới hạn đã biết và việc cần làm](#4-giới-hạn-đã-biết-và-việc-cần-làm)
5. [Danh sách kiểm tra khi triển khai production](#5-danh-sách-kiểm-tra-khi-triển-khai-production)
6. [Bản đồ mã nguồn và kiểm thử](#6-bản-đồ-mã-nguồn-và-kiểm-thử)

---

## 1. Tổng quan

**Tài sản cần bảo vệ:** dữ liệu cá nhân của thí sinh / khách hàng (tên, SĐT, nội dung chat), access token của Fanpage và Zalo OA, tài khoản nhân viên, và tính toàn vẹn của dữ liệu giữa các workspace (tenant).

**Các nguồn rủi ro chính và lớp phòng thủ tương ứng:**

| Rủi ro | Cơ chế chính |
| :--- | :--- |
| Đoán / dò mật khẩu | Argon2id, khóa tạm 15 phút sau 5 lần sai, rate limit `/auth/login` |
| Đánh cắp phiên | Access token 15 phút, refresh token HttpOnly xoay vòng và phát hiện tái sử dụng, `tokenVersion` |
| Người dùng xem dữ liệu workspace khác (IDOR) | `WorkspaceContextGuard` xác minh tư cách thành viên từ DB, truy vấn luôn kèm `workspaceId` |
| Nhân viên vượt quyền | Vai trò lấy từ DB, `STAFF` chỉ thấy khách hàng được giao |
| Webhook giả mạo | HMAC-SHA256 trên raw body, so sánh hằng thời gian |
| CSRF | Access token đi qua header `Authorization`, cookie refresh `SameSite=Lax`, kiểm tra Origin/Referer |
| SSRF qua media proxy | `safe-fetch`: chặn IP nội bộ, ghim DNS, kiểm tra từng redirect |
| Lộ token kênh khi lộ DB | AES-256-GCM với `TOKEN_ENCRYPTION_KEY` |
| DoS / spam request | Rate limit dùng chung qua Redis, webhook xử lý bất đồng bộ |
| Lộ thông tin qua lỗi | `AllExceptionsFilter` ẩn chi tiết ở production |

---

## 2. Vòng đời một request

```text
Client
  │  HTTPS (TLS kết thúc ở reverse proxy)
  ▼
Fastify  ── trustProxy = TRUST_PROXY ──► req.ip  (chỉ tin X-Forwarded-For từ proxy đã cấu hình)
  │        rawBody được giữ nguyên cho việc kiểm tra chữ ký webhook
  ▼
CORS (main.ts) ─ chỉ origin trong FRONTEND_URL
  ▼
Global guards (APP_GUARD)
  ├─ RateLimitGuard        → 429 nếu vượt ngưỡng (bộ đếm trên Redis)
  ├─ CsrfGuard             → 403 nếu Origin/Referer lạ ở POST/PUT/PATCH/DELETE
  ├─ JwtAuthGuard          → 401 nếu thiếu/sai token (trừ route @Public)
  └─ WorkspaceContextGuard → 403 nếu chỉ định workspace không phải của mình; gắn request.workspace
  ▼
Guard theo route (WorkspaceRolesGuard + @Roles, RealtimeTicketGuard...)
  ▼
Pipe validation (ZodValidationPipe / Schema.parse ở controller)
  ▼
Controller → Service (luôn lọc theo workspaceId đã xác minh) → Prisma (truy vấn tham số hóa)
  ▼
SecurityHeadersInterceptor (CSP, HSTS, nosniff, X-Frame-Options...) ── AllExceptionsFilter khi có lỗi
```

Các guard được đăng ký trong [app.module.ts](../../apps/api/src/app.module.ts) (rate limit, CSRF) và [auth.module.ts](../../apps/api/src/modules/auth/auth.module.ts) (JWT, workspace). Mặc định là **từ chối**: route nào không gắn `@Public()` đều cần Access Token hợp lệ.

---

## 3. Chi tiết từng cơ chế

### 3.1. Cấu hình và khóa bí mật

**Chống lại:** chạy production với khóa mẫu đã lộ trong mã nguồn, hoặc vô tình chạy ở chế độ nới lỏng vì thiếu cấu hình.

**Cách hoạt động** — [env.schema.ts](../../apps/api/src/platform/config/env.schema.ts):
1. Khi khởi động, `ConfigModule` gọi `validateEnv()`. Toàn bộ biến được kiểm tra bằng Zod. Có lỗi thì in danh sách và **dừng tiến trình** (fail-fast).
2. `NODE_ENV` không có giá trị mặc định: thiếu là không chạy.
3. Các khóa bắt buộc, không có giá trị mặc định:
   - `JWT_ACCESS_SECRET` (≥ 32 ký tự)
   - `TOKEN_ENCRYPTION_KEY` (≥ 32 ký tự)
   - ba khóa `PASSWORD_RECOVERY_*_KEY` (phải đúng 32 byte sau khi giải mã base64)
4. Khi `NODE_ENV=production`, kiểm tra thêm:
   - Khóa nằm trong danh sách khóa mẫu đã lộ bị từ chối.
   - Có `ZALO_APP_ID` thì bắt buộc có `ZALO_OA_SECRET_KEY` hoặc `ZALO_APP_SECRET`.
   - **Bắt buộc `REDIS_URL`**.
5. `JWT_ACCESS_TTL` phải có dạng `15m`, `1h`, `900s`, `1d`. Giá trị sai bị từ chối thay vì âm thầm dùng mặc định.

### 3.2. HTTP security headers và CORS

**Chống lại:** clickjacking, MIME sniffing, phản hồi API bị trình duyệt diễn giải thành HTML/JS, hạ cấp HTTPS, gọi API từ origin lạ.

**Cách hoạt động** — [security-headers.interceptor.ts](../../apps/api/src/common/security/security-headers.interceptor.ts), áp cho mọi response:

| Header | Giá trị | Lý do |
| :--- | :--- | :--- |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'` | API chỉ trả JSON nên không cho phép tải bất kỳ tài nguyên nào; không có `unsafe-inline` / `unsafe-eval`. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Chỉ gửi khi `NODE_ENV=production`, để tránh "khóa" HTTPS cho localhost khi phát triển. |
| `X-Frame-Options` | `DENY` | Tương đương `frame-ancestors 'none'` cho trình duyệt cũ. |
| `X-Content-Type-Options` | `nosniff` | Trình duyệt không tự đoán kiểu nội dung. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Không lộ đường dẫn nội bộ ra ngoài. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Tắt API phần cứng. |
| `X-XSS-Protection` | `1; mode=block` | Cho trình duyệt rất cũ. |

Ngoại lệ duy nhất: trang chẩn đoán WebSocket `GET /api/realtime/socket/test-client` (chỉ tồn tại ngoài production) tự ghi đè CSP cho riêng route đó để chạy script inline.

**CORS** ([main.ts](../../apps/api/src/main.ts)): `origin` là danh sách tách từ `FRONTEND_URL`, không dùng `*` hay `origin: true`, `credentials: true` để trình duyệt gửi được cookie refresh.

### 3.3. Rate limiting và xác định IP client

**Chống lại:** dò mật khẩu, spam API, và việc né giới hạn bằng cách giả IP.

**Xác định IP** — [main.ts](../../apps/api/src/main.ts), [trust-proxy.ts](../../apps/api/src/platform/config/trust-proxy.ts):
1. Fastify được tạo với `trustProxy = parseTrustProxy(TRUST_PROXY)`:
   - không đặt hoặc `false` → **không tin** `X-Forwarded-For`; `req.ip` là IP của kết nối TCP;
   - số `N` → tin N proxy gần nhất;
   - danh sách IP/CIDR → chỉ tin header khi request đến từ các proxy đó.
2. `RateLimitGuard` chỉ dùng `req.ip`. Guard **không tự đọc** `X-Forwarded-For` / `X-Real-IP`, vì client tự đặt được các header đó.

**Thuật toán** — [rate-limiter.service.ts](../../apps/api/src/common/security/rate-limiter.service.ts), [rate-limit.guard.ts](../../apps/api/src/common/guards/rate-limit.guard.ts):
1. Khóa đếm = `IP + route` (route có `@RateLimit`) hoặc `IP + global`.
2. Có Redis: một script Lua chạy **nguyên tử** trên một ZSET `ratelimit:<khóa>`, theo kiểu sliding window log:
   - xóa các mốc thời gian cũ hơn cửa sổ;
   - đếm số mốc còn lại; nếu đã đủ `limit` thì từ chối;
   - nếu chưa đủ thì thêm mốc hiện tại và đặt `PEXPIRE`.

   Mọi instance dùng chung một bộ đếm nên không thể né bằng cách rải request sang nhiều instance.
3. Không có Redis (chỉ dev/test), hoặc Redis lỗi: lùi về bộ đếm trong bộ nhớ tiến trình và ghi cảnh báo.
4. Trả các header `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Khi vượt ngưỡng trả `429` kèm `Retry-After`.

**Ngưỡng:**

| Phạm vi | Giới hạn |
| :--- | :--- |
| Mặc định mọi route | 120 request / 60 giây / IP |
| `POST /auth/login`, `POST /auth/register` | 10 / 60 giây |
| `POST /auth/password-recovery/{request,verify,reset}` | 5 / 60 giây, cộng thêm bộ đếm riêng của luồng khôi phục (xem 3.8) |
| `/api/webhook/:channel` | **Không áp** (`@SkipRateLimit`): Meta/Zalo gửi dồn từ một dải IP nhỏ, chặn 429 sẽ làm mất tin. Webhook được bảo vệ bằng chữ ký (3.11). |

### 3.4. Chống CSRF

**Chống lại:** trang web độc hại khiến trình duyệt của người dùng đã đăng nhập gửi request thay đổi dữ liệu.

**Tại sao rủi ro vốn đã thấp:** Access Token nằm trong bộ nhớ của web và được gửi qua header `Authorization: Bearer`. Trình duyệt không tự đính kèm header này vào request cross-site. Cookie duy nhất là `refresh_token`, có `HttpOnly`, `SameSite=Lax` và `Path=/api/auth`.

**Lớp bổ sung** — [csrf.guard.ts](../../apps/api/src/common/guards/csrf.guard.ts), với `POST/PUT/PATCH/DELETE`:
1. `GET/HEAD/OPTIONS` được bỏ qua (phương thức an toàn).
2. Route gắn `@SkipCsrf()` hoặc thuộc nhóm webhook được miễn, vì Meta/Zalo không gửi Origin của trình duyệt.
3. Có `Origin` → phải nằm trong `FRONTEND_URL`, hoặc trùng `Host` của chính API, hoặc là `http(s)://localhost:*` / `127.0.0.1`. Nếu không thì trả `403`.
4. Không có `Origin` nhưng có `Referer` → kiểm tra tương tự trên origin của `Referer`.
5. Không có cả hai (client không phải trình duyệt: mobile, curl) → bắt buộc có một header mà form HTML cross-site không thể tự gửi: `Authorization`, `X-Requested-With`, `X-Workspace-Id`, hoặc `Content-Type: application/json`.

### 3.5. Mật khẩu và khóa tài khoản

**Chống lại:** lộ mật khẩu khi lộ DB, dò mật khẩu trực tuyến.

**Băm mật khẩu** — [password.service.ts](../../apps/api/src/modules/auth/application/services/password.service.ts):
- Mật khẩu mới được băm bằng **Argon2id** (`argon2.hash`, có salt ngẫu nhiên). Không lưu mật khẩu dạng rõ.
- Hash cũ dạng bcrypt (`$2...`) vẫn đăng nhập được. Ngay khi đăng nhập đúng, hash được **tự nâng cấp** lên Argon2id.
- Độ dài mật khẩu 8–128 ký tự (Zod DTO).

**Khóa tài khoản** — [login.service.ts](../../apps/api/src/modules/auth/application/services/login.service.ts), [auth.constants.ts](../../apps/api/src/modules/auth/presentation/dto/auth.constants.ts):
1. Toàn bộ xử lý đăng nhập chạy trong transaction `Serializable`, tự thử lại khi xung đột. Nhờ vậy nhiều lần đăng nhập song song không thể "lách" bộ đếm.
2. Tài khoản `status != ACTIVE` → từ chối.
3. `lockedUntil` còn hiệu lực → từ chối, **kể cả khi mật khẩu đúng**.
4. Sai mật khẩu → tăng `failedLoginAttempts`. Đến lần thứ **5** thì đặt `lockedUntil = now + 15 phút`.
5. Khóa đã hết hạn → bắt đầu đếm lại từ 0.
6. Đăng nhập đúng → đặt lại bộ đếm và xóa khóa.
7. Mọi lần từ chối đều trả **cùng một thông báo** ("Email/số điện thoại hoặc mật khẩu không chính xác."), không cho biết tài khoản có tồn tại hay đang bị khóa. Lý do thật (`USER_NOT_FOUND`, `INVALID_PASSWORD`, `ACCOUNT_LOCKED`) chỉ ghi vào `audit_logs`.

### 3.6. Access token (JWT)

**Chống lại:** giả mạo token, dùng token của hệ thống khác, dùng token sau khi tài khoản bị khóa hoặc đổi phiên.

**Phát hành** — [jwt.config.ts](../../apps/api/src/platform/config/jwt.config.ts):
- Ký HS256 bằng `JWT_ACCESS_SECRET`.
- Claims: `sub` (user id), `jti`, `email`, `unique_name`, `tokenVersion`, `iss = JWT_ISSUER`, `aud = JWT_AUDIENCE`, `exp`.
- Thời hạn lấy từ `JWT_ACCESS_TTL`, mặc định **15 phút**. `JWT_EXPIRES_IN_MINUTES` chỉ là cấu hình cũ, chỉ có hiệu lực khi `JWT_ACCESS_TTL` để trống.
- Token **không chứa vai trò**: vai trò luôn được tra trong DB theo workspace (3.9).

**Xác thực mỗi request** — [jwt-auth.guard.ts](../../apps/api/src/modules/auth/presentation/guards/jwt-auth.guard.ts):
1. Bỏ qua route `@Public()`. Các route còn lại bắt buộc có header `Authorization: Bearer <token>`.
2. `verifyAsync` chỉ chấp nhận thuật toán `HS256`, `iss` và `aud` phải khớp cấu hình, kiểm tra cả chữ ký và hạn dùng. `JwtModule` cũng đặt sẵn các `verifyOptions` này, và hàm verify dự phòng trong `workspace-resolver.ts` kiểm tra tương tự.
3. Tra DB theo `sub`: user phải tồn tại, `status = ACTIVE`, và `tokenVersion` trong token phải bằng `tokenVersion` trong DB. Vì vậy việc khóa tài khoản có hiệu lực ngay, không phải chờ token hết hạn. Tăng `tokenVersion` sẽ vô hiệu mọi access token đang lưu hành.
4. Gắn `request.user = { id }` cho các bước sau.

### 3.7. Refresh token xoay vòng

**Chống lại:** refresh token bị đánh cắp và dùng lại, đánh cắp token qua XSS.

**Cách hoạt động** — [refresh-token.service.ts](../../apps/api/src/modules/auth/application/services/refresh-token.service.ts), [auth.controller.ts](../../apps/api/src/modules/auth/presentation/controllers/auth.controller.ts):
1. Khi đăng nhập, server sinh 32 byte ngẫu nhiên (base64url) làm refresh token. DB chỉ lưu **SHA-256** của token, cùng một `familyId` mới, IP và user-agent.
2. Token được gửi trong cookie `refresh_token`: `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`, `Secure` khi chạy production, sống `REFRESH_TTL_DAYS` ngày (mặc định 7).
3. `POST /auth/refresh`:
   - tìm bản ghi theo hash; kiểm tra hạn, `status = ACTIVE` và khóa tạm;
   - trong một transaction: tạo token mới **cùng `familyId`**, đánh dấu token cũ `revokedAt` và `replacedById`;
   - ký access token mới.
4. **Phát hiện tái sử dụng:** nếu token gửi lên đã bị thu hồi trước đó, tức ai đó đang dùng lại token cũ, thì toàn bộ token trong cùng `familyId` bị thu hồi ngay. Cả kẻ tấn công lẫn người dùng thật đều phải đăng nhập lại. Sự kiện được ghi audit với lý do `REFRESH_TOKEN_REUSE_DETECTED`.
5. `POST /auth/logout` thu hồi token hiện tại và xóa cookie.
6. Đổi mật khẩu qua luồng khôi phục thu hồi mọi refresh token của user.

### 3.8. Khôi phục mật khẩu bằng OTP

**Chống lại:** dò email tồn tại (user enumeration), dò OTP, lạm dụng gửi email, dùng lại link/mã đặt lại.

**Cách hoạt động** — [password-recovery module](../../apps/api/src/modules/password-recovery/):
1. **Yêu cầu (`/request`):**
   - Luôn trả `202 Accepted` với cùng một nội dung, dù email có tồn tại hay không. Email không tồn tại hoặc không đủ điều kiện vẫn tạo challenge ở trạng thái `INELIGIBLE` để thời gian xử lý và phản hồi trông giống nhau.
   - Email và IP được lưu dưới dạng **HMAC-SHA256** (`PASSWORD_RECOVERY_EMAIL_HMAC_KEY`), không lưu email dạng rõ trong bảng challenge.
2. **Rate limit trong DB** (bảng `password_recovery_rate_limit_buckets`):
   - theo IP và theo email cho bước yêu cầu;
   - cooldown giữa hai lần gửi;
   - theo IP cho bước xác minh và bước đặt lại.

   Ngưỡng lấy từ các biến `PASSWORD_RECOVERY_*_LIMIT` / `*_SECONDS`.
3. **OTP:**
   - 6 chữ số, sinh bằng `crypto.randomInt` và sống **5 phút**.
   - DB chỉ lưu *verifier* = HMAC-SHA256(challengeId, OTP) với `PASSWORD_RECOVERY_OTP_HMAC_KEY`.
   - Bản OTP để gửi email được mã hóa **AES-256-GCM** (`PASSWORD_RECOVERY_OTP_ENCRYPTION_KEY`).
   - Email được gửi bất đồng bộ bởi một worker dùng lease và fencing, có retry.
4. **Xác minh (`/verify`):**
   - So sánh verifier bằng `timingSafeEqual`.
   - Cập nhật theo kiểu compare-and-set để hai request song song không cùng được tính là đúng.
   - Sai **5 lần** → challenge chuyển sang `LOCKED`.
   - Đúng → phát hành reset token 32 byte ngẫu nhiên, DB chỉ lưu hash, có hạn dùng `PASSWORD_RECOVERY_RESET_TOKEN_TTL_SECONDS`.
5. **Đặt lại (`/reset`):**
   - Một transaction chỉ cập nhật challenge khi nó đang `VERIFIED`, chưa `consumedAt` và token còn hạn; sau đó xóa hash token, nên token **chỉ dùng được một lần**.
   - Mật khẩu mới được băm Argon2id. Bộ đếm sai và khóa tạm được đặt lại, mọi refresh token bị thu hồi.

### 3.9. Cô lập workspace và phân quyền OWNER / STAFF

**Chống lại:** người dùng đọc/sửa dữ liệu của workspace khác (IDOR xuyên tenant), nhân viên vượt quyền, giả vai trò bằng header.

**Xác định workspace** — [workspace-context.guard.ts](../../apps/api/src/common/guards/workspace-context.guard.ts), [workspace-membership.ts](../../apps/api/src/common/auth/workspace-membership.ts):
1. Chạy sau `JwtAuthGuard`, nên luôn đã có `request.user.id` đã xác thực.
2. Gom các workspace mà client **chỉ định rõ**: param `wsId` / `workspaceId`, query `workspaceId`, body `workspaceId`. Với mỗi giá trị, tra DB: người dùng phải là **owner** (`workspaces.owner_id`) hoặc **thành viên ACTIVE** (`workspace_members`).
   - Không phải thành viên → `403`.
   - Chỉ định hai workspace khác nhau trong cùng request → `403`.
3. Không chỉ định rõ → dùng header `X-Workspace-Id` nếu người dùng thực sự thuộc workspace đó. Không thuộc thì **bỏ qua** header (không báo lỗi, vì giá trị có thể là dữ liệu cũ trong localStorage) và dùng workspace mặc định của người dùng.
4. Gắn `request.workspace = { id, ownerId, role, status }`, trong đó `role` **lấy từ DB**.
5. Ghi đè các header danh tính cũ (`x-user-role`, `x-staff-id`, `x-owner-id`, `x-actor-id`, `x-member-status`, `x-workspace-id`) bằng giá trị đã xác minh, để mã cũ còn đọc header cũng không thể bị giả mạo.

**Dùng trong nghiệp vụ:**
- Controller lấy danh tính qua [`getRequestIdentity` / `requireWorkspaceId`](../../apps/api/src/common/auth/request-identity.ts), không đọc header.
- Mọi truy vấn khách hàng, deal, hoạt động, luật từ khóa, hội thoại, lưu trữ tin nhắn đều lọc theo `workspaceId`. Bản ghi thuộc workspace khác được trả **`404`** như không tồn tại, không trả `403`, để không xác nhận sự tồn tại của bản ghi.
- Tin nhắn từ webhook được gán workspace theo `ChannelAccount (channel, externalAccountId)` mà workspace đã kết nối, **không** theo `workspaceId` trong payload.
- Không có workspace hợp lệ thì truy vấn danh sách trả rỗng (fail-closed), không bao giờ trả dữ liệu của mọi tenant.

**Phân quyền vai trò** — [workspace-roles.guard.ts](../../apps/api/src/common/guards/workspace-roles.guard.ts) với `@Roles(...)`, cùng các kiểm tra trong service:

| Vai trò | Quyền |
| :--- | :--- |
| `OWNER` | Toàn quyền workspace: cấu hình, kết nối kênh, quản lý nhân sự, xem mọi hội thoại / khách hàng / báo cáo, dọn dẹp dữ liệu. |
| `STAFF` | Chỉ xem và sửa khách hàng / hội thoại **được giao cho chính mình**. Truy cập của người khác → `403`. Không được tự phân công cho người khác. |

Nhân viên bị gỡ khỏi workspace mất quyền ngay ở request kế tiếp, vì tư cách thành viên được tra DB trên **mỗi** request.

### 3.10. Dữ liệu đầu vào: validation, SQL injection, XSS

**Validation:**
- Các DTO quan trọng được kiểm tra bằng Zod, qua `ZodValidationPipe` hoặc `Schema.parse` trong controller: đăng nhập, đăng ký, khôi phục mật khẩu, cấu hình workspace, nhân sự, lưu trữ tin nhắn.
- Định danh trên URL được kiểm tra bằng `isUuid()` trước khi truy vấn.
- Phạm vi chưa phủ hết: xem mục 4.

**SQL injection:**
- Mọi truy vấn đi qua Prisma: query builder, hoặc `$queryRaw` / `$executeRaw` dạng tagged template, trong đó mọi giá trị là **tham số**.
- Các truy vấn dọn dẹp tin nhắn có điều kiện động ([message-storage.repository.ts](../../apps/api/src/modules/messaging/infrastructure/message-storage.repository.ts)) được ghép bằng `Prisma.sql` / `Prisma.join`, không ghép chuỗi. Mã nguồn không còn dùng `$queryRawUnsafe` / `$executeRawUnsafe`.

**XSS — dùng output encoding, không lọc đầu vào bằng regex:**
- API lưu dữ liệu **nguyên vẹn**. Tên khóa học như "JavaScript: Cơ bản" hay nội dung tin nhắn gửi cho khách không bị sửa.
- Web React tự escape mọi giá trị khi render; mã nguồn web không dùng `dangerouslySetInnerHTML` với dữ liệu người dùng.
- Phản hồi API là JSON, kèm CSP `default-src 'none'` và `nosniff`, nên không thể bị trình duyệt thực thi như trang HTML.
- File tải qua media proxy chỉ hiển thị inline với kiểu an toàn (3.13).
- `XssSanitizerPipe` (lọc regex toàn cục) **đã bị gỡ**: nó làm hỏng dữ liệu hợp lệ (đổi `javascript:` thành `blocked:`, xóa chuỗi dạng `on...=`) mà vẫn không phải biện pháp chống XSS đáng tin.

### 3.11. Webhook Facebook / Zalo

**Chống lại:** sự kiện giả mạo, ghi trùng tin, mất tin khi hệ thống chậm, bão retry của Meta.

**Xác thực chữ ký** (trước khi đụng tới DB). Fastify được cấu hình `rawBody: true`, nên chữ ký được tính trên **đúng chuỗi byte gốc**:
- **Facebook** ([facebook.adapter.ts](../../apps/api/src/modules/messaging/infrastructure/adapters/facebook.adapter.ts)): header `X-Hub-Signature-256: sha256=<hex>` = HMAC-SHA256(`META_APP_SECRET`, rawBody), so sánh bằng `crypto.timingSafeEqual`. Bước bắt tay `GET` chỉ trả `hub.challenge` khi `hub.verify_token` khớp `META_WEBHOOK_VERIFY_TOKEN`.
- **Zalo OA** ([zalo.adapter.ts](../../apps/api/src/modules/messaging/infrastructure/adapters/zalo.adapter.ts)): `X-ZEvent-Signature` = SHA-256(`appId + rawBody + timestamp + secret`), hoặc HMAC-SHA256 trên rawBody. So sánh hằng thời gian.
- **Thiếu khóa ký:** production **từ chối** mọi webhook. Ngoài production thì cho qua kèm cảnh báo trong log, để thử nghiệm qua tunnel.
- Chữ ký sai → `401`.
- Kênh `MANUAL_IMPORT` không nhận qua webhook công khai, chỉ qua `/messages/import` (cần đăng nhập).

**Xử lý tin** — [webhook.controller.ts](../../apps/api/src/modules/messaging/presentation/webhook.controller.ts), [receive-inbound-message.usecase.ts](../../apps/api/src/modules/messaging/application/receive-inbound-message.usecase.ts):
1. Trong request chỉ có: xác thực chữ ký → phân tích sự kiện → gán workspace theo `ChannelAccount` → `INSERT ... ON CONFLICT DO NOTHING` theo khóa duy nhất `(channel, external_message_id)` → đưa job vào BullMQ. Sau đó trả `200`, mục tiêu dưới 500 ms.
2. **Chống trùng:** Meta gửi lại cùng một sự kiện thì không tạo bản ghi hay job mới. Tin mới được ghép với sự kiện gốc theo `(channel, externalMessageId)`, không theo vị trí trong mảng, nên không gán nhầm khách khi lô có tin trùng.
3. **Không mất tin:**
   - Lưu thất bại → webhook trả `5xx` để nền tảng gửi lại (không trả `200` rồi bỏ tin).
   - Job BullMQ có `jobId = messageId`, retry 5 lần với backoff lũy thừa.
   - `UnprocessedMessageSweeper` mỗi phút đưa lại vào hàng đợi những tin INBOUND còn `processed_at = null` quá 2 phút.
4. Webhook không bị rate limit theo IP (3.3) và được miễn CSRF (3.4). Bảo vệ duy nhất cần thiết ở đây là chữ ký.

### 3.12. Mã hóa token kênh lưu trong DB

**Chống lại:** lộ bản sao DB / backup dẫn tới chiếm quyền Fanpage hoặc Zalo OA.

**Cách hoạt động** — [token-encryption.service.ts](../../apps/api/src/modules/channel-connection/infrastructure/token-encryption.service.ts):
1. Khóa AES-256 được dẫn xuất bằng SHA-256 của `TOKEN_ENCRYPTION_KEY`.
2. Mỗi lần mã hóa sinh IV ngẫu nhiên 16 byte và dùng **AES-256-GCM**. Kết quả lưu dạng `ivHex:authTagHex:cipherHex`.
3. Khi giải mã, kiểm tra độ dài IV/tag và **auth tag**. Dữ liệu bị sửa trong DB sẽ giải mã thất bại thay vì cho ra token sai.
4. Áp dụng cho `accessToken` và `refreshToken` của trang/OA khi kết nối kênh.

### 3.13. Media proxy và chống SSRF

**Chống lại:** dùng server làm "bàn đạp" gọi vào mạng nội bộ / metadata cloud (SSRF), và trả file độc hại hiển thị inline.

**Cách hoạt động** — [media-proxy.controller.ts](../../apps/api/src/modules/messaging/presentation/media-proxy.controller.ts), [safe-fetch.ts](../../apps/api/src/common/security/safe-fetch.ts):
1. Endpoint yêu cầu đăng nhập; không trả `Access-Control-Allow-Origin: *`.
2. Chỉ chấp nhận `http`/`https`, cổng 80/443, URL không chứa `user:pass@`. Có thể giới hạn thêm bằng `MEDIA_PROXY_ALLOWED_HOSTS` (danh sách hậu tố domain).
3. Phân giải DNS rồi **chặn mọi địa chỉ nội bộ / dành riêng**:
   - IPv4: `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16` (metadata cloud), CGNAT, multicast...
   - IPv6: `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped...
4. **Ghim kết nối** vào đúng IP đã kiểm tra (`lookup` tùy biến), để kẻ tấn công không đổi bản ghi DNS sang IP nội bộ giữa lúc kiểm tra và lúc kết nối (DNS rebinding).
5. Redirect được xử lý thủ công, **kiểm tra lại từng chặng**, tối đa 3 chặng.
6. Dữ liệu được stream với giới hạn `MEDIA_PROXY_MAX_BYTES` (mặc định 25 MB).
7. Chỉ ảnh / âm thanh / video / PDF được trả `inline`. Mọi kiểu khác, kể cả HTML và SVG, bị ép thành `application/octet-stream` + `Content-Disposition: attachment`, kèm `nosniff`. Proxy cũng đặt CSP `default-src 'none'; sandbox` cho nội dung trả về.

### 3.14. Realtime: WebSocket / SSE

**Chống lại:** nghe lén sự kiện của workspace khác, kết nối không xác thực, dùng lại vé kết nối.

**Vấn đề:** `EventSource` và `WebSocket` của trình duyệt không gửi được header `Authorization`.

**Cách hoạt động** — [realtime.service.ts](../../apps/api/src/modules/realtime/realtime.service.ts), [realtime-ticket.guard.ts](../../apps/api/src/modules/realtime/realtime-ticket.guard.ts):
1. Client gọi `POST /api/realtime/ticket` (có Access Token) để nhận một **vé** gắn với (user, workspace đã xác minh), gồm `jti` ngẫu nhiên và hạn **60 giây**, ký HMAC-SHA256.
2. Mở `GET /api/realtime/stream?ticket=...` (SSE) hoặc `/api/realtime/ws?ticket=...` (WebSocket).
3. Server kiểm tra chữ ký (`timingSafeEqual`) và hạn của vé, rồi **tiêu thụ** vé:
   - Có Redis: `SET realtime:ticket:<jti> NX EX <ttl>`. Vé đã dùng ở bất kỳ instance nào cũng bị từ chối.
   - Không có Redis: dùng danh sách vé đã dùng trong bộ nhớ.

   Vé không hợp lệ → `401` ngay ở bước bắt tay. Với SSE, việc kiểm tra do một guard bất đồng bộ đảm nhận nên trả mã `401` chuẩn.
4. Mỗi kết nối chỉ nhận sự kiện có `workspaceId` trùng workspace của vé. Sự kiện không có `workspaceId` không được gửi cho ai.
5. Presence (trực tuyến / bận) được lưu theo workspace (`presence:<workspaceId>` trên Redis). Danh tính lấy từ token; `staffId` do client gửi lên bị bỏ qua.
6. Khi chạy nhiều instance, sự kiện được phát qua Redis pub/sub. Mỗi instance chỉ chuyển cho các client đang kết nối với nó, vẫn theo bộ lọc workspace ở bước 4.
7. Các endpoint thử nghiệm (`simulate-inbound`, `pipeline-change`, `socket/test-ping`, `socket/test-client`) trả `404` ở production. Ngoài production, chúng yêu cầu vai trò `OWNER`, trừ trang test-client.

### 3.15. Xử lý lỗi, chống lộ thông tin

**Cách hoạt động** — [all-exceptions.filter.ts](../../apps/api/src/common/filters/all-exceptions.filter.ts):
1. Bắt mọi exception và trả JSON cùng một định dạng: `statusCode`, `error`, `message`, `timestamp`, `path`, và `traceId` nếu có.
2. Lỗi Prisma được dịch sang mã HTTP và thông báo trung tính:

   | Mã Prisma | Ý nghĩa | HTTP |
   | :--- | :--- | :--- |
   | `P2002` | trùng dữ liệu | `409` |
   | `P2025` | không tìm thấy | `404` |
   | `P2003`, `P2014`, `P2022` | vi phạm ràng buộc / sai cấu trúc | `400` |
   | lỗi kết nối DB | — | `503` |
3. Lỗi không xác định ở **production** chỉ trả "Đã có lỗi hệ thống xảy ra...", không có stack trace, câu SQL hay chuỗi kết nối.
4. Server ghi log đầy đủ: method, path, `req.ip`, `traceId`, stack (với lỗi 5xx). `traceId` lấy từ header `X-Request-Id` / `X-Trace-Id`, nếu không có thì dùng id request của Fastify.

### 3.16. Nhật ký kiểm toán

**Cách hoạt động** — [audit module](../../apps/api/src/modules/audit/), bảng `audit_logs`:
- **Trường:** `userId`, `actorId`, `action`, `ip`, `userAgent`, `metadata` (JSONB), `createdAt`.
- **Sự kiện đang được ghi:**
  - `LOGIN_SUCCESS`, `LOGIN_FAILURE`, kèm lý do; refresh token thành công cũng được ghi là `LOGIN_SUCCESS` với lý do `TOKEN_REFRESH`;
  - phát hiện tái sử dụng refresh token;
  - `ROLE_CHANGED` (chỉ được ghi trong `OwnerController`, hiện không truy cập được; xem mục 4 #8). Các thao tác mời / gỡ nhân viên trong module workspace hiện chưa ghi audit;
  - `CONTACT_MERGED` / `CONTACT_UNMERGED`;
  - `MESSAGE_STORAGE_PURGED` (dọn dẹp tin nhắn thủ công hoặc tự động).
- Audit log là nơi phân biệt "sai mật khẩu" với "tài khoản bị khóa", là thông tin không bao giờ trả cho client.

### 3.17. Chạy nhiều instance an toàn

Ngoài hiệu năng, một số cơ chế bảo mật **chỉ đúng** khi trạng thái được chia sẻ giữa các instance. Vì vậy production bắt buộc có Redis.

| Cơ chế | Nếu chỉ lưu trong bộ nhớ tiến trình | Hiện tại (Redis) |
| :--- | :--- | :--- |
| Rate limit | Rải request qua N instance được giới hạn × N | Một bộ đếm chung |
| Vé realtime dùng 1 lần | Dùng lại được trên instance khác | `SET NX` dùng chung |
| Cron dọn dẹp / giám sát | Mỗi instance chạy một lần, gửi trùng cảnh báo | `DistributedLockService`: khóa `SET NX PX` + nhả bằng Lua đối chiếu token |
| Hàng đợi tin | Mất job khi tiến trình chết | BullMQ bền vững (Redis AOF) |

Mã nguồn: [platform/redis](../../apps/api/src/platform/redis/).

### 3.18. Dữ liệu seed và đóng gói Docker

- **Seed** ([seed.ts](../../apps/api/prisma/seed.ts)):
  - Từ chối chạy khi `NODE_ENV=production` (trừ khi đặt `ALLOW_PRODUCTION_SEED=true`).
  - Không hardcode mật khẩu: đọc từ `SEED_*_PASSWORD`, nếu trống thì sinh ngẫu nhiên.
  - `ON CONFLICT DO NOTHING`: **không bao giờ** ghi đè mật khẩu, vai trò hay chủ workspace đã có.
- **Docker** ([Dockerfile](../../apps/api/Dockerfile), [.dockerignore](../../.dockerignore)):
  - Image chạy bằng user `node` (không phải root).
  - `.dockerignore` loại mọi tệp `.env` ở mọi cấp thư mục, để secret không bị đóng vào image.
  - Secret được nạp lúc chạy qua `env_file` của compose.

---

## 4. Giới hạn đã biết và việc cần làm

Các điểm dưới đây là **thực trạng**, đã kiểm tra trong code. Không nên coi hệ thống là "cô lập tuyệt đối" trước khi xử lý chúng.

| # | Giới hạn | Ảnh hưởng | Hướng xử lý |
| :--- | :--- | :--- | :--- |
| 1 | Bảng `contacts`, `channel_identities`, `contact_merge_logs` chưa có `workspace_id`; SĐT chuẩn hóa là unique toàn hệ thống. | `/contacts/*` mới yêu cầu đăng nhập, chưa cô lập theo tenant. | Migration thêm `workspace_id`, đổi unique thành `(workspace_id, phone)`. |
| 2 | Đặt lại mật khẩu thu hồi refresh token nhưng **không tăng `tokenVersion`**; chưa có endpoint "đăng xuất mọi thiết bị" (`revokeAllForUser` chưa được gọi ở đâu). | Access token đang lưu hành còn dùng được tối đa `JWT_ACCESS_TTL` (15 phút) sau khi đổi mật khẩu. | Tăng `tokenVersion` trong transaction đặt lại mật khẩu; thêm endpoint đăng xuất mọi thiết bị. |
| 3 | `POST /auth/refresh` trả refresh token mới cả trong body JSON, ngoài cookie HttpOnly. | Nếu có XSS, script đọc được refresh token, làm giảm giá trị của `HttpOnly`. | Bỏ `refreshToken` khỏi body khi client là trình duyệt. |
| 4 | Xoay vòng refresh token đọc rồi mới ghi, không khóa bản ghi. | Hai request refresh đồng thời với cùng token có thể cùng thành công. | Dùng `updateMany ... where revokedAt IS NULL` và kiểm tra `count === 1`. |
| 5 | Đăng nhập với tài khoản không tồn tại không chạy bước băm mật khẩu. | Chênh lệch thời gian phản hồi có thể tiết lộ email có tồn tại hay không. | Băm/so sánh với một hash giả khi không tìm thấy user. |
| 6 | `CsrfGuard` luôn chấp nhận origin `http(s)://localhost:*` kể cả ở production, và miễn CSRF theo chuỗi con URL (`/webhook`, `/channels/facebook`, `/channels/zalo`). | Phạm vi miễn rộng hơn cần thiết. | Chỉ cho phép localhost khi không phải production; dùng `@SkipCsrf()` thay cho so khớp URL. |
| 7 | Mới 5/19 controller kiểm tra body bằng Zod; số còn lại nhận `@Body()` không có schema. | Dữ liệu sai kiểu đi sâu vào service (không phải lỗ hổng injection vì Prisma tham số hóa, nhưng dễ gây lỗi 500 hoặc ghi dữ liệu bẩn). | Bổ sung schema Zod cho deals, activities, customers, notifications, keyword rules... |
| 8 | `OwnerController` (`/owner/*`, trong đó `owner/audit-logs` không lọc theo workspace) dùng `RolesGuard` đọc `role` từ token. Token không chứa `role` nên các route này hiện **luôn bị từ chối**. | An toàn nhờ fail-closed, nhưng sẽ thành lỗ hổng xuyên tenant nếu ai đó thêm `role` vào token. | Chuyển sang `WorkspaceRolesGuard` và lọc audit log theo workspace, hoặc gỡ controller. |
| 9 | Webhook không có cửa sổ chống phát lại theo thời gian (Meta không gửi timestamp; Zalo có `timestamp` nhưng chưa kiểm tra độ mới). | Gói tin hợp lệ bị phát lại không tạo bản ghi mới nhờ khóa `(channel, externalMessageId)`, nhưng vẫn tốn tài nguyên xử lý. | Kiểm tra `timestamp` của Zalo trong khoảng vài phút. |
| 10 | Kết nối SSE/WebSocket đã mở không bị kiểm tra lại khi nhân viên bị gỡ khỏi workspace. | Người bị gỡ vẫn nhận sự kiện đến khi ngắt kết nối. | Đóng các kết nối của user khi thay đổi tư cách thành viên (phát qua pub/sub). |
| 11 | `traceId` chỉ có trong body lỗi; chưa sinh id cho mọi request và chưa trả về trong header response. | Khó truy vết request thành công. | Sinh `X-Request-Id` cho mọi request và đặt vào header response. |
| 12 | Khóa của `TokenEncryptionService` được dẫn xuất bằng một vòng SHA-256 và chưa có số phiên bản khóa. | Không xoay vòng được `TOKEN_ENCRYPTION_KEY` mà không mã hóa lại toàn bộ token. | Thêm tiền tố phiên bản khóa vào ciphertext. |

---

## 5. Danh sách kiểm tra khi triển khai production

1. **Khóa và môi trường:** `NODE_ENV=production`. Sinh riêng cho môi trường này `JWT_ACCESS_SECRET`, `TOKEN_ENCRYPTION_KEY` và ba khóa `PASSWORD_RECOVERY_*_KEY`, lưu trong trình quản lý secret (Docker secrets / Vault / biến môi trường của nền tảng). Không commit `.env`.
2. **Redis:** đặt `REDIS_URL`, bật AOF và `maxmemory-policy noeviction` như trong `docker-compose.yml`. Không để Redis lộ ra Internet; nên bật mật khẩu (`redis://:password@host:6379`).
3. **TLS và proxy:** kết thúc TLS ở reverse proxy (TLS 1.2+, WSS cho WebSocket). Đặt `TRUST_PROXY` đúng số hop hoặc IP của proxy. Không mở cổng API trực tiếp ra Internet khi đã đặt `TRUST_PROXY=true`.
4. **Webhook:** cấu hình `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `ZALO_OA_SECRET_KEY` (hoặc `ZALO_APP_SECRET`).
5. **CORS/CSRF:** `FRONTEND_URL` chỉ chứa domain thật của web.
6. **Email:** cấu hình SMTP để luồng khôi phục mật khẩu hoạt động.
7. **Database:** chạy `prisma migrate deploy`. Tài khoản DB của ứng dụng không nên là superuser. Sao lưu định kỳ (backup chứa token kênh đã mã hóa và dữ liệu cá nhân, cần được bảo vệ tương đương).
8. **Không chạy seed** trên production.
9. **Giám sát:** theo dõi `audit_logs` (nhiều `LOGIN_FAILURE`, `REFRESH_TOKEN_REUSE_DETECTED`), log `Inbound job ... failed` và tỉ lệ `429`.
10. **Xoay vòng khóa:** xoay `META_APP_SECRET` / `ZALO_*` định kỳ. Xoay `JWT_ACCESS_SECRET` sẽ đăng xuất mọi phiên access token, còn refresh token vẫn dùng được.

---

## 6. Bản đồ mã nguồn và kiểm thử

| Thành phần | Mã nguồn | Kiểm thử |
| :--- | :--- | :--- |
| Kiểm tra cấu hình | `apps/api/src/platform/config/env.schema.ts` | `src/platform/config/env.schema.spec.ts` |
| Security headers | `apps/api/src/common/security/security-headers.interceptor.ts` | `test/common/security.spec.ts` |
| Rate limit, IP client | `common/security/rate-limiter.service.ts`, `common/guards/rate-limit.guard.ts`, `platform/config/trust-proxy.ts` | `test/common/security.spec.ts`, `test/messaging/inbound-queue.spec.ts` |
| CSRF | `common/guards/csrf.guard.ts` | `test/common/security.spec.ts` |
| Mật khẩu, khóa tài khoản | `modules/auth/application/services/{password,login}.service.ts` | `test/auth/*` |
| JWT | `platform/config/jwt.config.ts`, `modules/auth/presentation/guards/jwt-auth.guard.ts` | `test/auth/jwt-token.service.spec.ts` |
| Refresh token | `modules/auth/application/services/refresh-token.service.ts` | `test/auth/refresh-token.service.spec.ts` |
| Khôi phục mật khẩu | `modules/password-recovery/**` | `test/auth/password-recovery-reset.e2e-spec.ts` |
| Workspace / RBAC | `common/guards/workspace-context.guard.ts`, `common/guards/workspace-roles.guard.ts`, `common/auth/*` | `test/security/request-identity.spec.ts`, `test/channel-connection/workspace-roles.guard.spec.ts`, `test/auth/rbac.e2e-spec.ts` |
| Webhook | `modules/messaging/infrastructure/adapters/{facebook,zalo}.adapter.ts`, `presentation/webhook.controller.ts` | `test/messaging/{facebook,zalo}.adapter.spec.ts`, `test/security/zalo-webhook-signature.spec.ts`, `test/messaging/webhook.controller.spec.ts`, `test/messaging/receive-inbound-message.spec.ts` |
| Mã hóa token kênh | `modules/channel-connection/infrastructure/token-encryption.service.ts` | `test/channel-connection/token-encryption.service.spec.ts` |
| SSRF | `common/security/safe-fetch.ts`, `modules/messaging/presentation/media-proxy.controller.ts` | `test/security/safe-fetch.spec.ts` |
| Realtime | `modules/realtime/*` | `test/realtime/*` |
| Xử lý lỗi | `common/filters/all-exceptions.filter.ts` | `test/common/all-exceptions.filter.spec.ts` |
| Redis, khóa phân tán | `platform/redis/*` | `test/messaging/inbound-queue.spec.ts` |
| Ẩn danh hóa khách hàng | `modules/customers/*` | `test/customers/anonymize-customer.spec.ts` |
