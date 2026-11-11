import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  SafeFetchError,
  createSizeLimiter,
  isPrivateAddress,
  resolvePublicAddress,
  safeGet,
} from '../../src/common/security/safe-fetch.js';

describe('safe-fetch (chống SSRF)', () => {
  describe('isPrivateAddress', () => {
    it.each([
      '127.0.0.1',
      '10.1.2.3',
      '172.16.5.5',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // metadata cloud
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      '::',
      'fe80::1',
      'fc00::1',
      'fd12:3456::1',
      '::ffff:127.0.0.1',
      '::ffff:7f00:1', // IPv4-mapped dạng hex
      '::ffff:169.254.169.254',
      'khong-phai-ip',
    ])('chặn %s', (addr) => {
      expect(isPrivateAddress(addr)).toBe(true);
    });

    it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111'])(
      'cho phép địa chỉ công khai %s',
      (addr) => {
        expect(isPrivateAddress(addr)).toBe(false);
      },
    );
  });

  describe('resolvePublicAddress', () => {
    const publicResolver = async () => ['93.184.216.34'];

    it('trả về IP công khai đã phân giải', async () => {
      await expect(resolvePublicAddress(new URL('https://example.com/a.png'), { resolver: publicResolver })).resolves.toBe(
        '93.184.216.34',
      );
    });

    it('chặn host có BẤT KỲ địa chỉ nội bộ nào (DNS rebinding / multi-A)', async () => {
      const resolver = async () => ['93.184.216.34', '10.0.0.5'];
      await expect(resolvePublicAddress(new URL('https://evil.example/'), { resolver })).rejects.toMatchObject({
        code: 'BLOCKED',
      });
    });

    it('chặn IP literal nội bộ, kể cả IPv6 và IPv4-mapped', async () => {
      for (const u of ['http://127.0.0.1/', 'http://[::1]/', 'http://[::ffff:7f00:1]/', 'http://169.254.169.254/latest/meta-data']) {
        await expect(resolvePublicAddress(new URL(u), { resolver: publicResolver })).rejects.toBeInstanceOf(SafeFetchError);
      }
    });

    it('chặn giao thức khác http/https, cổng lạ và user:pass trong URL', async () => {
      await expect(resolvePublicAddress(new URL('file:///etc/passwd'))).rejects.toMatchObject({ code: 'INVALID_URL' });
      await expect(resolvePublicAddress(new URL('ftp://example.com/'), { resolver: publicResolver })).rejects.toMatchObject({
        code: 'INVALID_URL',
      });
      await expect(resolvePublicAddress(new URL('http://example.com:6379/'), { resolver: publicResolver })).rejects.toMatchObject({
        code: 'BLOCKED',
      });
      await expect(
        resolvePublicAddress(new URL('https://user:pass@example.com/'), { resolver: publicResolver }),
      ).rejects.toMatchObject({ code: 'INVALID_URL' });
    });

    it('áp dụng danh sách tên miền cho phép (khớp theo hậu tố, không khớp chuỗi con)', async () => {
      const opts = { resolver: publicResolver, allowedHostSuffixes: ['fbcdn.net'] };
      await expect(resolvePublicAddress(new URL('https://scontent.fbcdn.net/x'), opts)).resolves.toBeDefined();
      await expect(resolvePublicAddress(new URL('https://fbcdn.net/x'), opts)).resolves.toBeDefined();
      await expect(resolvePublicAddress(new URL('https://evilfbcdn.net/x'), opts)).rejects.toMatchObject({ code: 'BLOCKED' });
      await expect(resolvePublicAddress(new URL('https://fbcdn.net.evil.com/x'), opts)).rejects.toMatchObject({ code: 'BLOCKED' });
    });

    it('lỗi phân giải DNS được báo là UPSTREAM', async () => {
      const resolver = async () => {
        throw new Error('ENOTFOUND');
      };
      await expect(resolvePublicAddress(new URL('https://khong-ton-tai.example/'), { resolver })).rejects.toMatchObject({
        code: 'UPSTREAM',
      });
    });
  });

  describe('safeGet', () => {
    it('không bao giờ kết nối tới địa chỉ nội bộ', async () => {
      await expect(safeGet('http://127.0.0.1:80/')).rejects.toMatchObject({ code: 'BLOCKED' });
      await expect(safeGet('http://localhost/', { resolver: async () => ['127.0.0.1'] })).rejects.toMatchObject({
        code: 'BLOCKED',
      });
    });

    it('từ chối URL không hợp lệ', async () => {
      await expect(safeGet('không phải url')).rejects.toMatchObject({ code: 'INVALID_URL' });
    });
  });

  describe('createSizeLimiter', () => {
    it('cho qua dữ liệu trong giới hạn', async () => {
      const chunks: Buffer[] = [];
      await pipeline(
        Readable.from([Buffer.alloc(40), Buffer.alloc(40)]),
        createSizeLimiter(100),
        async function (source) {
          for await (const c of source) chunks.push(c as Buffer);
        },
      );
      expect(Buffer.concat(chunks).length).toBe(80);
    });

    it('ngắt luồng bằng TOO_LARGE khi vượt giới hạn', async () => {
      await expect(
        pipeline(Readable.from([Buffer.alloc(60), Buffer.alloc(60)]), createSizeLimiter(100), async function (source) {
          for await (const _ of source) {
            /* tiêu thụ */
          }
        }),
      ).rejects.toMatchObject({ code: 'TOO_LARGE' });
    });
  });
});
