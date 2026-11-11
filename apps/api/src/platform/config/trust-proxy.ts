export type TrustProxySetting = boolean | string[] | ((address: string, hop: number) => boolean);

/**
 * Chuyển TRUST_PROXY thành giá trị `trustProxy` của Fastify.
 *
 * - Không đặt / rỗng / "false": KHÔNG tin X-Forwarded-For (req.ip = IP kết nối TCP). Mặc định an toàn.
 * - Số nguyên N: tin N proxy gần nhất (ví dụ 1 khi chỉ có một Nginx/Load Balancer phía trước).
 * - Danh sách IP/CIDR phân tách bằng dấu phẩy: chỉ tin X-Forwarded-For khi request đến từ các địa chỉ đó.
 * - "true": tin mọi proxy. CHỈ dùng khi API không thể bị truy cập trực tiếp từ Internet.
 */
export function parseTrustProxy(raw: string | undefined): TrustProxySetting {
  const value = raw?.trim();
  if (!value || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    return (_address: string, hop: number) => hop < hops;
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
