import { afterEach, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { ZaloAdapter } from '../../src/modules/messaging/infrastructure/adapters/zalo.adapter.js';

const SECRET = 'zalo-oa-secret-for-tests';
const APP_ID = '1234567890';

const makeReq = (rawBody: string, headers: Record<string, string | string[] | undefined> = {}) => ({
  headers,
  rawBody: Buffer.from(rawBody),
});

describe('ZaloAdapter.verifyRequest (chữ ký webhook)', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.ZALO_OA_SECRET_KEY;
  const prevAppSecret = process.env.ZALO_APP_SECRET;

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
    if (prevSecret === undefined) delete process.env.ZALO_OA_SECRET_KEY;
    else process.env.ZALO_OA_SECRET_KEY = prevSecret;
    if (prevAppSecret === undefined) delete process.env.ZALO_APP_SECRET;
    else process.env.ZALO_APP_SECRET = prevAppSecret;
  });

  const body = JSON.stringify({ event_name: 'user_send_text', timestamp: '1700000000000', message: { text: 'hi' } });

  function adapterWithSecret() {
    const adapter = new ZaloAdapter();
    adapter.setSecret(SECRET, APP_ID);
    return adapter;
  }

  it('chấp nhận X-ZEvent-Signature đúng (sha256(appId + body + timestamp + secret))', () => {
    const mac = crypto.createHash('sha256').update(`${APP_ID}${body}1700000000000${SECRET}`).digest('hex');
    expect(adapterWithSecret().verifyRequest(makeReq(body, { 'x-zevent-signature': `mac=${mac}` }))).toBe(true);
    expect(adapterWithSecret().verifyRequest(makeReq(body, { 'x-zevent-signature': mac }))).toBe(true);
  });

  it('từ chối X-ZEvent-Signature sai hoặc body bị sửa', () => {
    const mac = crypto.createHash('sha256').update(`${APP_ID}${body}1700000000000${SECRET}`).digest('hex');
    const tampered = body.replace('hi', 'hacked');
    expect(adapterWithSecret().verifyRequest(makeReq(tampered, { 'x-zevent-signature': mac }))).toBe(false);
    expect(adapterWithSecret().verifyRequest(makeReq(body, { 'x-zevent-signature': 'mac=deadbeef' }))).toBe(false);
  });

  it('chấp nhận HMAC-SHA256 trên raw body và từ chối chữ ký sai', () => {
    const adapter = adapterWithSecret();
    const sig = adapter.signPayload(body);
    expect(adapter.verifyRequest(makeReq(body, { 'x-hub-signature-256': sig }))).toBe(true);
    expect(adapter.verifyRequest(makeReq(body, { 'x-zalo-signature': sig.replace('sha256=', '') }))).toBe(true);

    const wrong = adapter.signPayload(body, 'secret-khac');
    expect(adapter.verifyRequest(makeReq(body, { 'x-hub-signature-256': wrong }))).toBe(false);
    expect(adapter.verifyRequest(makeReq(`${body} `, { 'x-hub-signature-256': sig }))).toBe(false);
  });

  it('đã cấu hình secret mà thiếu header chữ ký -> từ chối (mọi môi trường)', () => {
    process.env.NODE_ENV = 'development';
    expect(adapterWithSecret().verifyRequest(makeReq(body))).toBe(false);
    process.env.NODE_ENV = 'production';
    expect(adapterWithSecret().verifyRequest(makeReq(body))).toBe(false);
  });

  it('production mà chưa cấu hình secret -> từ chối (fail-secure)', () => {
    delete process.env.ZALO_OA_SECRET_KEY;
    delete process.env.ZALO_APP_SECRET;
    process.env.NODE_ENV = 'production';
    expect(new ZaloAdapter().verifyRequest(makeReq(body))).toBe(false);
  });

  it('chỉ môi trường dev/test mới cho phép bỏ qua khi chưa có secret', () => {
    delete process.env.ZALO_OA_SECRET_KEY;
    delete process.env.ZALO_APP_SECRET;
    process.env.NODE_ENV = 'test';
    expect(new ZaloAdapter().verifyRequest(makeReq(body))).toBe(true);
  });

  it('chữ ký có độ dài khác không làm ném lỗi mà chỉ trả false', () => {
    expect(adapterWithSecret().verifyRequest(makeReq(body, { 'x-hub-signature-256': 'sha256=ab' }))).toBe(false);
  });
});
