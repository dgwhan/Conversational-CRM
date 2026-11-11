import { lookup as dnsLookup } from 'node:dns/promises';
import http, { type IncomingMessage } from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import { Transform, type TransformCallback } from 'node:stream';

/**
 * Tiện ích gọi HTTP(S) ra ngoài an toàn trước SSRF:
 *  - Phân giải DNS rồi kiểm tra TẤT CẢ địa chỉ trả về (IPv4 + IPv6) không thuộc dải nội bộ / dành riêng.
 *  - "Ghim" kết nối vào đúng IP đã kiểm tra (chống DNS-rebinding: không phân giải lại lần 2).
 *  - Tự xử lý redirect thủ công, mỗi chặng đều được kiểm tra lại.
 *  - Chỉ cho phép cổng 80/443, không cho phép user:pass trong URL.
 */

export class SafeFetchError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_URL' | 'BLOCKED' | 'TOO_MANY_REDIRECTS' | 'TOO_LARGE' | 'UPSTREAM' | 'TIMEOUT',
  ) {
    super(message);
    this.name = 'SafeFetchError';
  }
}

const blockedV4 = new BlockList();
for (const [net, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local, metadata cloud
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + broadcast
] as const) {
  blockedV4.addSubnet(net, prefix, 'ipv4');
}

const blockedV6 = new BlockList();
for (const [net, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96], // NAT64
  ['100::', 64], // discard
  ['2001::', 23], // IETF protocol assignments (gồm Teredo)
  ['2001:db8::', 32], // documentation
  ['2002::', 16], // 6to4
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['fec0::', 10], // site-local (deprecated)
  ['ff00::', 8], // multicast
] as const) {
  blockedV6.addSubnet(net, prefix, 'ipv6');
}

/** Trả về IPv4 nhúng trong địa chỉ IPv4-mapped (::ffff:a.b.c.d hoặc ::ffff:7f00:1), nếu có */
function embeddedIPv4(ipv6: string): string | null {
  const lower = ipv6.toLowerCase();
  const match = /^(?:0{0,4}:){2,5}ffff:(.+)$/.exec(lower) ?? /^::ffff:(.+)$/.exec(lower);
  if (!match) return null;
  const tail = match[1];
  if (tail.includes('.')) return isIP(tail) === 4 ? tail : null;
  const groups = tail.split(':');
  if (groups.length !== 2) return null;
  const hi = Number.parseInt(groups[0], 16);
  const lo = Number.parseInt(groups[1], 16);
  if (Number.isNaN(hi) || Number.isNaN(lo)) return null;
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** true nếu địa chỉ IP thuộc dải nội bộ / loopback / link-local / dành riêng (không được phép truy cập) */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return blockedV4.check(address, 'ipv4');
  if (family === 6) {
    const v4 = embeddedIPv4(address);
    if (v4) return blockedV4.check(v4, 'ipv4');
    return blockedV6.check(address, 'ipv6');
  }
  return true; // không phải IP hợp lệ -> chặn
}

export interface SafeGetOptions {
  /** Số chặng redirect tối đa (mặc định 3) */
  maxRedirects?: number;
  /** Timeout cho kết nối + nhận header (ms, mặc định 10_000) */
  timeoutMs?: number;
  /** Danh sách hậu tố hostname được phép (nếu rỗng = mọi host công khai) */
  allowedHostSuffixes?: string[];
  headers?: Record<string, string>;
  /** Cho test: thay thế bước phân giải DNS */
  resolver?: (hostname: string) => Promise<string[]>;
}

export interface SafeGetResult {
  statusCode: number;
  headers: IncomingMessage['headers'];
  stream: IncomingMessage;
  finalUrl: URL;
}

function hostAllowed(hostname: string, suffixes?: string[]): boolean {
  if (!suffixes || suffixes.length === 0) return true;
  const host = hostname.toLowerCase();
  return suffixes.some((s) => {
    const suffix = s.trim().toLowerCase().replace(/^\./, '');
    return suffix.length > 0 && (host === suffix || host.endsWith(`.${suffix}`));
  });
}

async function defaultResolver(hostname: string): Promise<string[]> {
  const results = await dnsLookup(hostname, { all: true, verbatim: true });
  return results.map((r) => r.address);
}

/** Kiểm tra URL + phân giải DNS, trả về địa chỉ IP công khai đầu tiên để ghim kết nối */
export async function resolvePublicAddress(url: URL, options: SafeGetOptions = {}): Promise<string> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SafeFetchError('Chỉ hỗ trợ giao thức HTTP/HTTPS.', 'INVALID_URL');
  }
  if (url.username || url.password) {
    throw new SafeFetchError('URL không được chứa thông tin đăng nhập.', 'INVALID_URL');
  }
  const port = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80;
  if (port !== 80 && port !== 443) {
    throw new SafeFetchError('Chỉ cho phép cổng 80/443.', 'BLOCKED');
  }

  // URL.hostname của IPv6 có dạng "[::1]"
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) throw new SafeFetchError('URL không hợp lệ.', 'INVALID_URL');
  if (!hostAllowed(hostname, options.allowedHostSuffixes)) {
    throw new SafeFetchError('Tên miền không nằm trong danh sách cho phép.', 'BLOCKED');
  }

  let addresses: string[];
  if (isIP(hostname)) {
    addresses = [hostname];
  } else {
    try {
      addresses = await (options.resolver ?? defaultResolver)(hostname);
    } catch {
      throw new SafeFetchError('Không phân giải được tên miền.', 'UPSTREAM');
    }
  }

  if (addresses.length === 0) throw new SafeFetchError('Không phân giải được tên miền.', 'UPSTREAM');
  // Chỉ cần MỘT địa chỉ nội bộ là từ chối toàn bộ (tránh kẻ tấn công trộn bản ghi công khai + nội bộ)
  if (addresses.some((a) => isPrivateAddress(a))) {
    throw new SafeFetchError('Không được phép truy cập địa chỉ nội bộ.', 'BLOCKED');
  }
  return addresses[0];
}

function requestOnce(url: URL, address: string, options: SafeGetOptions): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const family = isIP(address) === 6 ? 6 : 4;

    const req = lib.request(
      {
        protocol: url.protocol,
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CRM-MediaProxy/1.0)',
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          ...options.headers,
        },
        // Ghim kết nối vào IP đã kiểm tra; TLS vẫn xác thực theo hostname gốc (servername mặc định = hostname)
        lookup: ((_host: string, opts: { all?: boolean }, cb: (...args: unknown[]) => void) => {
          if (opts && opts.all) cb(null, [{ address, family }]);
          else cb(null, address, family);
        }) as never,
        timeout: options.timeoutMs ?? 10_000,
      },
      (res) => resolve(res),
    );

    req.on('timeout', () => {
      req.destroy(new SafeFetchError('Hết thời gian chờ máy chủ gốc.', 'TIMEOUT'));
    });
    req.on('error', (err) => {
      reject(err instanceof SafeFetchError ? err : new SafeFetchError(`Lỗi kết nối: ${err.message}`, 'UPSTREAM'));
    });
    req.end();
  });
}

/**
 * GET an toàn (stream). Người gọi PHẢI đọc hoặc destroy `stream` của kết quả.
 */
export async function safeGet(rawUrl: string | URL, options: SafeGetOptions = {}): Promise<SafeGetResult> {
  const maxRedirects = options.maxRedirects ?? 3;
  let current: URL;
  try {
    current = rawUrl instanceof URL ? rawUrl : new URL(rawUrl);
  } catch {
    throw new SafeFetchError('URL không hợp lệ.', 'INVALID_URL');
  }

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const address = await resolvePublicAddress(current, options);
    const res = await requestOnce(current, address, options);
    const status = res.statusCode ?? 0;

    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume(); // bỏ body redirect
      try {
        current = new URL(res.headers.location, current);
      } catch {
        throw new SafeFetchError('URL chuyển hướng không hợp lệ.', 'INVALID_URL');
      }
      continue;
    }

    return { statusCode: status, headers: res.headers, stream: res, finalUrl: current };
  }

  throw new SafeFetchError('Quá nhiều lần chuyển hướng.', 'TOO_MANY_REDIRECTS');
}

/** Transform ngắt luồng (lỗi TOO_LARGE) khi vượt quá số byte cho phép */
export function createSizeLimiter(maxBytes: number): Transform {
  let total = 0;
  return new Transform({
    transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback) {
      total += chunk.length;
      if (total > maxBytes) {
        cb(new SafeFetchError('Tệp vượt quá dung lượng cho phép.', 'TOO_LARGE'));
        return;
      }
      cb(null, chunk);
    },
  });
}
