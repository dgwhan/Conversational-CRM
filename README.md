# POLARISX Recruitment CRM

Hệ thống CRM tuyển sinh đa kênh: gom tin nhắn Facebook Messenger và Zalo (OA và Zalo cá nhân) về một hộp thư chung, tự động tạo và phân loại khách hàng tiềm năng, quản lý phễu tuyển sinh (Kanban), deal, hoạt động chăm sóc và báo cáo. Mỗi đơn vị dùng hệ thống là một **workspace** độc lập với hai vai trò `OWNER` và `STAFF`.

Monorepo pnpm gồm API NestJS (Fastify) và web React, dữ liệu trên PostgreSQL, hàng đợi và trạng thái dùng chung trên Redis.

---

## Mục lục

- [Tính năng chính](#tính-năng-chính)
- [Kiến trúc](#kiến-trúc)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Chạy nhanh bằng Docker](#chạy-nhanh-bằng-docker)
- [Phát triển trên máy](#phát-triển-trên-máy)
- [Biến môi trường](#biến-môi-trường)
- [Cơ sở dữ liệu và Prisma](#cơ-sở-dữ-liệu-và-prisma)
- [Kiểm thử và chất lượng mã](#kiểm-thử-và-chất-lượng-mã)
- [Triển khai production](#triển-khai-production)
- [Tài liệu kỹ thuật](#tài-liệu-kỹ-thuật)
- [Xử lý sự cố](#xử-lý-sự-cố)

---

## Tính năng chính

| Nhóm | Mô tả |
| :--- | :--- |
| **Hộp thư hợp nhất** | Nhận tin qua webhook Facebook / Zalo OA, đồng bộ Zalo cá nhân (`zca-js`), nhập lịch sử từ CSV. Chống trùng theo `(channel, externalMessageId)`. Gửi trả lời và đánh dấu đã xem ngược về nền tảng. |
| **Khách hàng & liên hệ** | Tự tạo khách hàng khi có tin mới, gộp liên hệ theo số điện thoại chuẩn hóa, ánh xạ nhãn nguồn (vd. *Facebook Lead*) sang nhãn và trạng thái lead nội bộ, ẩn danh hóa dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP. |
| **Phễu tuyển sinh** | Kanban theo giai đoạn, deal, lịch và nhật ký hoạt động; cập nhật thời gian thực qua WebSocket / SSE. |
| **Phân loại & chấm điểm** | Bộ luật từ khóa theo workspace và engine NLP chấm điểm hội thoại. |
| **Workspace & nhân sự** | Tạo workspace, mời nhân viên, phân công hội thoại; `STAFF` chỉ thấy khách hàng được giao. |
| **Vận hành** | Trả lời tự động ngoài giờ làm việc, giám sát hạn phiên Zalo cá nhân, chính sách lưu trữ và dọn dẹp tin nhắn, thông báo trong ứng dụng. |
| **Bảo mật** | Xác thực JWT + refresh token xoay vòng, khóa tài khoản, khôi phục mật khẩu bằng OTP, cô lập dữ liệu theo workspace, xác thực chữ ký webhook, chống SSRF, rate limit dùng chung. Xem [SECURITY_STANDARDIZATION.md](docs/modules/SECURITY_STANDARDIZATION.md). |

---

## Kiến trúc

```text
                ┌───────────────────────┐
  Trình duyệt ─▶│  apps/web (React 19)  │
                └──────────┬────────────┘
                           │ HTTPS: REST /api/*  ·  WebSocket /api/realtime/ws  ·  SSE /api/realtime/stream
  Meta / Zalo ──webhook──▶ │
                ┌──────────▼────────────────────────────────────────────────┐
                │ apps/api (NestJS 12 + Fastify)                             │
                │  Guard toàn cục: rate limit, CSRF, JWT, workspace + vai trò  │
                │  Webhook: xác thực HMAC → lưu tin → đưa job vào hàng đợi     │
                │  Worker BullMQ: khách hàng, realtime, ngoài giờ, phân loại   │
                │  Cron (có khóa phân tán): retention, Zalo monitor, sweeper   │
                └───────┬─────────────────────────────┬─────────────────────┘
                        │ Prisma 7 (adapter pg)        │ ioredis
                ┌───────▼────────┐            ┌────────▼──────────────────────────┐
                │ PostgreSQL 16  │            │ Redis 7: hàng đợi BullMQ, rate     │
                │                │            │ limit, presence, pub/sub realtime, │
                └────────────────┘            │ vé realtime dùng 1 lần, khóa cron  │
                                              └───────────────────────────────────┘
```

| Thành phần | Công nghệ |
| :--- | :--- |
| Monorepo | pnpm workspaces |
| API | NestJS 12, Fastify 5, TypeScript 6, Zod 4 (kiểm tra cấu hình và DTO) |
| Dữ liệu | PostgreSQL 16, Prisma 7 với `@prisma/adapter-pg`, schema tách nhiều file trong `prisma/schema/` |
| Hàng đợi & trạng thái dùng chung | Redis 7, BullMQ 6, ioredis |
| Realtime | `ws` (WebSocket) và Server-Sent Events, xác thực bằng vé ngắn hạn |
| Web | React 19, Vite 8, React Router 7, Tailwind CSS 4, Chart.js |
| Kiểm thử | Vitest, Supertest, Testing Library |
| Đóng gói | Docker multi-stage, chạy bằng user không phải root |

**Luồng tin nhắn đến (tóm tắt):** webhook chỉ xác thực chữ ký, lưu tin (bỏ qua tin trùng) và đưa job vào BullMQ rồi trả `200`, mục tiêu dưới 500 ms. Worker đảm nhận phần nặng: đồng bộ khách hàng, đẩy realtime, trả lời ngoài giờ, phân loại. Lưu tin thất bại thì webhook trả `5xx` để nền tảng gửi lại. Tin đã lưu mà chưa xử lý quá 2 phút được cron đưa lại vào hàng đợi. Chi tiết trong [messaging.md](docs/modules/messaging.md).

---

## Cấu trúc thư mục

```text
PolarisX-Recruitment-CRM/
├── apps/
│   ├── api/                              # Backend NestJS
│   │   ├── prisma/
│   │   │   ├── schema/                   # user, workspace, messaging, contact, deal, activity,
│   │   │   │                             # audit, notification, keyword-rule, password-recovery
│   │   │   ├── migrations/
│   │   │   └── seed.ts                   # dữ liệu demo cho môi trường phát triển
│   │   ├── src/
│   │   │   ├── main.ts                   # khởi tạo Fastify, CORS, trustProxy, WebSocket
│   │   │   ├── app.module.ts             # đăng ký guard / interceptor / filter toàn cục
│   │   │   ├── platform/                 # config (env schema, JWT), database, redis, health
│   │   │   ├── common/                   # guards, decorators, filters, security, auth helpers
│   │   │   ├── contracts/                # Zod schema và kiểu dùng chung
│   │   │   └── modules/
│   │   │       ├── auth/                 # đăng nhập, đăng ký, refresh token, JwtAuthGuard
│   │   │       ├── password-recovery/    # khôi phục mật khẩu bằng OTP qua email
│   │   │       ├── workspace-config/     # workspace, cấu hình, nhân sự, lời mời
│   │   │       ├── messaging/            # webhook, hàng đợi inbound, khách hàng, liên hệ, lưu trữ
│   │   │       ├── channel-connection/   # kết nối Facebook / Zalo, gửi tin, đồng bộ
│   │   │       ├── realtime/             # WebSocket, SSE, presence
│   │   │       ├── deals/  activities/  reports/  nlp/  notification/  mail/  audit/
│   │   │       └── customers/            # nghiệp vụ ẩn danh hóa khách hàng
│   │   └── test/                         # unit / integration test (Vitest)
│   └── web/                              # Frontend React
│       └── src/
│           ├── app/  layouts/  components/  config/  i18n/  lib/  styles/
│           ├── features/auth/
│           └── modules/                  # inbox, kanban, deals, calendar, reports, workspace,
│                                         # realtime, notification, activities, landing, legal ...
├── docs/                                 # tài liệu kỹ thuật và nghiệp vụ
├── docker-compose.yml                    # postgres, redis, api
├── .env.example
└── pnpm-workspace.yaml
```

---

## Yêu cầu môi trường

- **Node.js** 22 trở lên (image Docker dùng `node:22-alpine`).
- **pnpm**, khuyến nghị dùng qua Corepack: `corepack enable`, sau đó `pnpm` hoặc `corepack pnpm`.
- **Docker Engine** 24+ và **Docker Compose V2** (`docker compose`).

---

## Chạy nhanh bằng Docker

```bash
git clone <repository-url>
cd PolarisX-Recruitment-CRM
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
```

Mở `.env` và điền tối thiểu các khóa bắt buộc:

| Biến | Cách tạo |
| :--- | :--- |
| `NODE_ENV` | `development` |
| `JWT_ACCESS_SECRET` | chuỗi ngẫu nhiên ≥ 32 ký tự, vd. `openssl rand -base64 48` |
| `TOKEN_ENCRYPTION_KEY` | chuỗi ngẫu nhiên ≥ 32 ký tự, vd. `openssl rand -base64 48` |
| `PASSWORD_RECOVERY_EMAIL_HMAC_KEY`, `PASSWORD_RECOVERY_OTP_HMAC_KEY`, `PASSWORD_RECOVERY_OTP_ENCRYPTION_KEY` | mỗi khóa là **đúng 32 byte mã hóa base64**: `openssl rand -base64 32` (ba khóa khác nhau) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/recruitment_crm?schema=public` |

Khởi động toàn bộ:

```bash
docker compose up --build -d
docker compose ps
curl http://localhost:3000/api/health      # {"status":"ok"}
```

Compose chạy `postgres` và `redis` (có healthcheck, dữ liệu lưu trong volume `crm_postgres_data` và `crm_redis_data`), sau đó build và chạy `api`. Container `api` nạp biến từ `.env`, còn `DATABASE_URL` và `REDIS_URL` được tự trỏ tới host `postgres`/`redis` trong mạng Docker. Muốn dùng giá trị khác thì đặt `DATABASE_URL_DOCKER` / `REDIS_URL_DOCKER`.

> Image không tự chạy migration. Lần đầu cần áp schema từ máy host: `pnpm --filter api exec prisma migrate deploy` (hoặc `pnpm db:reset` cho môi trường phát triển, lệnh này xóa sạch dữ liệu).

---

## Phát triển trên máy

```bash
pnpm install
docker compose up -d postgres redis          # chỉ chạy hạ tầng
pnpm --filter api prisma:generate
pnpm --filter api exec prisma migrate deploy # hoặc: pnpm db:reset (xóa dữ liệu + seed)
pnpm dev:api                                 # API: http://localhost:3000/api (watch mode)
pnpm dev:web                                 # Web: http://localhost:5173
```

`.env` được đọc từ thư mục gốc hoặc `apps/api/.env`. Khi chạy trên máy, đặt `REDIS_URL=redis://localhost:6379`.

**Tài khoản demo:** `pnpm prisma:seed` tạo một `OWNER`, một `STAFF` và workspace `polarisx`.
- Email lấy từ `SEED_OWNER_EMAIL` / `SEED_STAFF_EMAIL` (mặc định `owner@gmail.com` / `staff@gmail.com`).
- Mật khẩu lấy từ `SEED_OWNER_PASSWORD` / `SEED_STAFF_PASSWORD`. Nếu để trống, seed sinh mật khẩu ngẫu nhiên và in ra **một lần** cho tài khoản vừa tạo.
- Seed không ghi đè tài khoản đã có và từ chối chạy khi `NODE_ENV=production`.

**Không có Redis?** Ở `development`/`test` có thể để trống `REDIS_URL`: hàng đợi chạy nền trong tiến trình, rate limit / presence / khóa cron dùng bộ nhớ. Chế độ này chỉ đúng khi chạy **một** instance. Production bắt buộc có Redis.

**Webhook khi phát triển:** dùng tunnel (ngrok, cloudflared) trỏ `https://<tunnel>/api/webhook/facebook` và `/api/webhook/zalo`. Nếu để trống `META_APP_SECRET` / `ZALO_OA_SECRET_KEY`, chữ ký chỉ được bỏ qua ngoài production, kèm cảnh báo trong log.

---

## Biến môi trường

Cấu hình được kiểm tra bằng Zod khi khởi động ([env.schema.ts](apps/api/src/platform/config/env.schema.ts)). Thiếu hoặc sai biến thì ứng dụng dừng ngay và in danh sách lỗi. Bảng đầy đủ kèm ví dụ nằm trong [.env.example](.env.example).

| Biến | Bắt buộc | Mặc định | Ý nghĩa |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Có | — | `development` \| `production` \| `test`. Không có mặc định để tránh vô tình chạy chế độ nới lỏng. |
| `PORT` | | `3000` | Cổng HTTP của API. |
| `DATABASE_URL` | Có | — | Chuỗi kết nối PostgreSQL. |
| `REDIS_URL` | Production | — | Redis cho hàng đợi, rate limit, presence, pub/sub, khóa cron. |
| `INBOUND_WORKER_ENABLED` / `INBOUND_WORKER_CONCURRENCY` | | `true` / `5` | Bật/tắt worker xử lý tin trên instance này và số job chạy song song. |
| `TRUST_PROXY` | | không tin | Proxy tin cậy để đọc `X-Forwarded-For`: số hop (vd. `1`) hoặc danh sách IP/CIDR. |
| `FRONTEND_URL` | | `http://localhost:5173` | Danh sách origin được phép (CORS, CSRF), phân tách bằng dấu phẩy. |
| `APP_BASE_URL` | | `http://localhost:3000` | URL công khai của API. |
| `JWT_ACCESS_SECRET` | Có | — | Khóa ký Access Token (≥ 32 ký tự; khóa mẫu bị từ chối ở production). |
| `JWT_ACCESS_TTL` | | `15m` | Thời hạn Access Token (`15m`, `1h`, `900s`...). `JWT_EXPIRES_IN_MINUTES` đã ngừng dùng, chỉ còn hiệu lực khi biến này trống. |
| `JWT_ISSUER` / `JWT_AUDIENCE` | | `PolarisX-Recruitment-CRM` / `PolarisX-Recruitment-CRM-Client` | Claim `iss` / `aud`, được kiểm tra khi xác thực token. |
| `REFRESH_TTL_DAYS` | | `7` | Thời hạn refresh token (ngày). |
| `TOKEN_ENCRYPTION_KEY` | Có | — | Khóa mã hóa AES-256-GCM cho access token của Facebook/Zalo lưu trong DB. |
| `PASSWORD_RECOVERY_*_KEY` (3 khóa) | Có | — | Khóa HMAC/AES 32 byte (base64) cho luồng khôi phục mật khẩu. |
| `PASSWORD_RECOVERY_*` (giới hạn, thời gian) | | xem schema | Ngưỡng rate limit, cooldown gửi lại, retry gửi email. |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM` | Khi gửi email | — | SMTP gửi OTP khôi phục mật khẩu. Thiếu `MAIL_HOST`/`MAIL_PORT`/`MAIL_FROM` thì không gửi được email và luồng quên mật khẩu không hoạt động. |
| `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` | Khi dùng Facebook | — | Ứng dụng Meta, khóa ký webhook, token xác minh đăng ký webhook. |
| `ZALO_APP_ID`, `ZALO_APP_SECRET`, `ZALO_OA_SECRET_KEY` | Khi dùng Zalo | — | Production có `ZALO_APP_ID` thì bắt buộc một trong hai khóa ký. |
| `MEDIA_PROXY_MAX_BYTES` / `MEDIA_PROXY_ALLOWED_HOSTS` | | `26214400` / mọi host công khai | Giới hạn dung lượng và danh sách domain cho media proxy. |
| `SEED_*` | | — | Tài khoản demo cho `prisma:seed`. |
| `VITE_API_BASE_URL` và các `VITE_*` khác | | — | Cấu hình của web khi build. |

---

## Cơ sở dữ liệu và Prisma

| Lệnh | Tác dụng |
| :--- | :--- |
| `pnpm --filter api prisma:generate` | Sinh Prisma Client sau khi đổi schema. |
| `pnpm --filter api prisma:migrate` | Tạo và áp migration mới (`prisma migrate dev`, chỉ dùng khi phát triển). |
| `pnpm --filter api exec prisma migrate deploy` | Áp các migration đã có (staging / production). |
| `pnpm prisma:seed` | Nạp dữ liệu demo. |
| `pnpm db:reset` | **Xóa toàn bộ dữ liệu**, đẩy lại schema và seed (chỉ dùng khi phát triển). |
| `pnpm prisma:studio` | Giao diện xem dữ liệu. |

Truy cập DB trực tiếp (DBeaver, pgAdmin): `localhost:5432`, user/mật khẩu/DB theo `POSTGRES_*` trong `.env`. Xóa sạch dữ liệu Docker: `docker compose down -v` (xóa cả volume Postgres và Redis).

---

## Kiểm thử và chất lượng mã

```bash
pnpm --filter api test          # unit / integration test (Vitest)
pnpm --filter api test:e2e      # e2e, cần PostgreSQL (DATABASE_URL_TEST)
pnpm --filter api typecheck
pnpm --filter api lint          # oxlint
pnpm --filter web test
pnpm --filter web typecheck
```

---

## Triển khai production

Danh sách kiểm tra tối thiểu (lý do chi tiết nằm trong [tài liệu bảo mật](docs/modules/SECURITY_STANDARDIZATION.md#5-danh-sách-kiểm-tra-khi-triển-khai-production)):

1. `NODE_ENV=production`. Mọi khóa (`JWT_ACCESS_SECRET`, `TOKEN_ENCRYPTION_KEY`, ba khóa `PASSWORD_RECOVERY_*`) phải sinh riêng cho môi trường này và để trong trình quản lý secret, không commit.
2. Có `REDIS_URL` (Redis bật AOF, `maxmemory-policy noeviction`). Thiếu biến này thì ứng dụng không khởi động.
3. Đặt API sau reverse proxy có TLS và cấu hình `TRUST_PROXY` đúng số hop. HSTS được API tự gửi khi chạy production.
4. Cấu hình `META_APP_SECRET` và `ZALO_OA_SECRET_KEY` / `ZALO_APP_SECRET`: production từ chối webhook không có chữ ký hợp lệ.
5. `FRONTEND_URL` chỉ chứa domain thật của web.
6. Chạy `prisma migrate deploy` trước khi khởi động phiên bản mới.
7. Chạy nhiều instance được: trạng thái dùng chung nằm trên Redis và cron có khóa phân tán. Có thể tách instance nhận webhook (`INBOUND_WORKER_ENABLED=false`) khỏi instance chạy worker.

---

## Tài liệu kỹ thuật

| Tài liệu | Nội dung |
| :--- | :--- |
| [docs/modules/SECURITY_STANDARDIZATION.md](docs/modules/SECURITY_STANDARDIZATION.md) | Cách hoạt động của từng cơ chế bảo mật, giới hạn đã biết, checklist production |
| [docs/modules/auth.md](docs/modules/auth.md) | Đăng nhập, token, khôi phục mật khẩu |
| [docs/modules/messaging.md](docs/modules/messaging.md) | Webhook, hàng đợi inbound, worker, chống trùng |
| [docs/modules/realtime-socket.md](docs/modules/realtime-socket.md) | WebSocket / SSE, vé realtime, presence |
| [docs/modules/message-storage-and-retention.md](docs/modules/message-storage-and-retention.md) | Lưu trữ và dọn dẹp tin nhắn |
| [docs/modules/notification-and-zalo-monitor.md](docs/modules/notification-and-zalo-monitor.md) | Thông báo, giám sát phiên Zalo |
| [docs/modules/workspace-kanban.md](docs/modules/workspace-kanban.md) | Workspace, phễu Kanban |
| [docs/business-workflows/](docs/business-workflows/) | Luồng nghiệp vụ xác thực và CRM mạng xã hội |
| [docs/test-cases/QA_WEB_TEST_CASES.md](docs/test-cases/QA_WEB_TEST_CASES.md) | Kịch bản kiểm thử giao diện |

---

## Xử lý sự cố

| Triệu chứng | Cách xử lý |
| :--- | :--- |
| `ENVIRONMENT CONFIGURATION ERROR` khi khởi động | Đọc danh sách biến bị báo lỗi và sửa `.env`. Ba khóa `PASSWORD_RECOVERY_*_KEY` phải là đúng 32 byte base64. |
| `REDIS_URL is required` | Đang chạy `NODE_ENV=production` mà chưa có Redis: thêm `REDIS_URL`. |
| `listen EADDRINUSE` (3000 / 5432 / 6379) | Đổi `PORT`, `POSTGRES_PORT`, `REDIS_PORT` trong `.env`, rồi `docker compose up -d`. |
| Webhook trả `401` | Sai `META_APP_SECRET` / `ZALO_OA_SECRET_KEY`, hoặc proxy đã sửa body (chữ ký tính trên raw body). |
| Tin nhắn đến nhưng không hiện trong hộp thư | Xem log worker (`Inbound job ... failed`). Kiểm tra Redis và `INBOUND_WORKER_ENABLED`. Tin chưa xử lý được tự đưa lại hàng đợi sau khoảng 2 phút. |
| `429 Too Many Requests` hàng loạt sau proxy | Chưa đặt `TRUST_PROXY`, nên mọi người dùng bị tính chung IP của proxy. |
| PowerShell chặn script `pnpm.ps1` | `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`, hoặc gọi `corepack pnpm ...`. |

Xem log: `docker compose logs -f api` (tương tự với `postgres`, `redis`). Build lại không dùng cache: `docker compose build --no-cache api`.
