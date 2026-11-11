import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import pg from 'pg';

/**
 * Seed dữ liệu demo cho môi trường phát triển: 1 OWNER, 1 STAFF và workspace mặc định "PolarisX".
 *
 * An toàn khi chạy lại / chạy nhầm:
 * - Từ chối chạy khi NODE_ENV=production (trừ khi đặt ALLOW_PRODUCTION_SEED=true).
 * - KHÔNG ghi đè user / mật khẩu / workspace / vai trò đã tồn tại (ON CONFLICT DO NOTHING).
 * - Không hardcode mật khẩu: lấy từ SEED_OWNER_PASSWORD / SEED_STAFF_PASSWORD, nếu thiếu thì sinh ngẫu nhiên
 *   và in ra MỘT lần cho tài khoản vừa được tạo.
 */

// Load environment variables from app level or workspace root level
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error('Refusing to run seed with NODE_ENV=production. Set ALLOW_PRODUCTION_SEED=true if this is intended.');
  process.exit(1);
}

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/recruitment_crm?schema=public';

const pool = new pg.Pool({ connectionString });

type SeedAccount = {
  email: string;
  password: string;
  passwordGenerated: boolean;
  workspaceRole: 'OWNER' | 'STAFF';
  fullName: string;
};

function resolvePassword(envName: string): { password: string; generated: boolean } {
  const fromEnv = process.env[envName]?.trim();
  if (fromEnv) return { password: fromEnv, generated: false };
  return { password: randomBytes(18).toString('base64url'), generated: true };
}

function buildAccount(
  emailEnv: string,
  defaultEmail: string,
  passwordEnv: string,
  workspaceRole: SeedAccount['workspaceRole'],
  fullName: string,
): SeedAccount {
  const { password, generated } = resolvePassword(passwordEnv);
  return {
    email: (process.env[emailEnv]?.trim() || defaultEmail).toLowerCase(),
    password,
    passwordGenerated: generated,
    workspaceRole,
    fullName,
  };
}

const owner = buildAccount('SEED_OWNER_EMAIL', 'owner@gmail.com', 'SEED_OWNER_PASSWORD', 'OWNER', 'Owner');
const staff = buildAccount('SEED_STAFF_EMAIL', 'staff@gmail.com', 'SEED_STAFF_PASSWORD', 'STAFF', 'Staff');
const accounts: SeedAccount[] = [owner, staff];

const WORKSPACE_SLUG = 'polarisx';

const client = await pool.connect();

try {
  await client.query(`ALTER TYPE "workspace_member_role" ADD VALUE IF NOT EXISTS 'STAFF'`);
} catch { }

const report: string[] = [];

try {
  await client.query('BEGIN');

  const userIds = new Map<string, string>();
  for (const account of accounts) {
    const passwordHash = await argon2.hash(account.password);

    // Không ghi đè user đã có (đặc biệt là password_hash)
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO users
         (id, email, full_name, password_hash, status, token_version, must_change_password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE'::"user_status", 0, FALSE, NOW(), NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [randomUUID(), account.email, account.fullName, passwordHash],
    );

    if (inserted.rows[0]) {
      userIds.set(account.email, inserted.rows[0].id);
      report.push(
        account.passwordGenerated
          ? `Created ${account.workspaceRole} ${account.email} with generated password: ${account.password}`
          : `Created ${account.workspaceRole} ${account.email} (password from env)`,
      );
    } else {
      const existing = await client.query<{ id: string }>(`SELECT id FROM users WHERE email = $1 LIMIT 1`, [account.email]);
      if (existing.rows[0]) userIds.set(account.email, existing.rows[0].id);
      report.push(`User ${account.email} already exists: left unchanged (password not modified)`);
    }
  }

  // Owner của workspace mặc định là chính tài khoản OWNER vừa seed (cùng một email)
  const ownerId = userIds.get(owner.email);
  if (!ownerId) {
    throw new Error(`Owner user ${owner.email} could not be created or found`);
  }

  const createdWs = await client.query<{ id: string }>(
    `INSERT INTO workspaces (id, name, slug, owner_id, is_active, created_at, updated_at)
     VALUES ($1, 'PolarisX', $2, $3, true, NOW(), NOW())
     ON CONFLICT (slug) DO NOTHING
     RETURNING id`,
    [randomUUID(), WORKSPACE_SLUG, ownerId],
  );
  let workspaceId = createdWs.rows[0]?.id;
  if (workspaceId) {
    report.push(`Created workspace "${WORKSPACE_SLUG}" owned by ${owner.email}`);
  } else {
    const existingWs = await client.query<{ id: string }>(`SELECT id FROM workspaces WHERE slug = $1 LIMIT 1`, [WORKSPACE_SLUG]);
    workspaceId = existingWs.rows[0]?.id;
    report.push(`Workspace "${WORKSPACE_SLUG}" already exists: owner left unchanged`);
  }
  if (!workspaceId) {
    throw new Error(`Workspace "${WORKSPACE_SLUG}" could not be created or found`);
  }

  // Gán các user vào workspace_members; không đổi vai trò của thành viên đã có
  for (const account of accounts) {
    const userId = userIds.get(account.email);
    if (!userId) continue;
    const member = await client.query(
      `INSERT INTO workspace_members (id, workspace_id, user_id, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4::"workspace_member_role", true, NOW(), NOW())
       ON CONFLICT (workspace_id, user_id) DO NOTHING
       RETURNING id`,
      [randomUUID(), workspaceId, userId, account.workspaceRole],
    );
    report.push(
      member.rowCount
        ? `Added ${account.email} to "${WORKSPACE_SLUG}" as ${account.workspaceRole}`
        : `${account.email} is already a member of "${WORKSPACE_SLUG}": role left unchanged`,
    );
  }

  // Gán các channel_accounts chưa có workspace_id vào workspace mặc định
  const channels = await client.query(
    `UPDATE channel_accounts SET workspace_id = $1 WHERE workspace_id IS NULL`,
    [workspaceId],
  );
  if (channels.rowCount) report.push(`Attached ${channels.rowCount} orphan channel account(s) to "${WORKSPACE_SLUG}"`);

  // Nối workspace_id trong workspace_configurations với workspace của owner
  await client.query(
    `UPDATE workspace_configurations SET workspace_id = $1 WHERE owner_id = $2 AND (workspace_id IS NULL OR workspace_id != $1)`,
    [workspaceId, ownerId],
  );

  await client.query('COMMIT');
  console.log('Seed completed:');
  for (const line of report) console.log(`  - ${line}`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
