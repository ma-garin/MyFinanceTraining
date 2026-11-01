import { describe, it, expect, vi, afterEach } from 'vitest';
import { callClaude, CLAUDE_ENDPOINT, ERROR_MESSAGES } from './claudeClient';

const DUMMY = 'test-dummy-key';
const okBody = { content: [{ type: 'text', text: '- 連想先: A / 理由: B' }] };
const respond = (status: number, body: unknown = {}) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => { vi.useRealTimers(); });

describe('callClaude', () => {
  it('Messages API へ必要なヘッダーとモデルで POST し、本文を返す', async () => {
    const f = respond(200, okBody);
    const r = await callClaude({ apiKey: DUMMY, model: 'claude-sonnet-5-5', prompt: 'p', fetchImpl: f });
    expect(r).toEqual({ ok: true, text: '- 連想先: A / 理由: B' });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(CLAUDE_ENDPOINT);
    const h = init?.headers as Record<string, string>;
    expect(h['x-api-key']).toBe(DUMMY);
    expect(h['anthropic-version']).toBe('2023-06-01');
    expect(h['anthropic-dangerous-direct-browser-access']).toBe('true');
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('claude-sonnet-5-5');
    expect(body.messages).toEqual([{ role: 'user', content: 'p' }]);
  });

  it('回答拒否（stop_reason: refusal）は部分文面を取り込まず refusal を返し、temperature・thinking を送らない', async () => {
    const f = respond(200, { stop_reason: 'refusal', content: [{ type: 'text', text: '途中' }] });
    const r = await callClaude({ apiKey: DUMMY, model: 'claude-opus-5-5', prompt: 'p', fetchImpl: f });
    expect(r).toEqual({ ok: false, kind: 'refusal', message: ERROR_MESSAGES.refusal });
    const body = JSON.parse(String(f.mock.calls[0][1]?.body));
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('thinking');
  });

  it('thinking ブロックが混じっても text ブロックだけを返す', async () => {
    const f = respond(200, { content: [{ type: 'thinking', thinking: 'x' }, { type: 'text', text: '本文' }] });
    expect(await callClaude({ apiKey: DUMMY, model: 'm', prompt: 'p', fetchImpl: f })).toEqual({ ok: true, text: '本文' });
  });

  it.each([
    [401, 'auth'], [429, 'rate_limit'], [500, 'server'], [529, 'server'], [400, 'bad_request'],
  ] as const)('HTTP %i は %s として利用者向け文言を返す', async (status, kind) => {
    const r = await callClaude({ apiKey: DUMMY, model: 'm', prompt: 'p', fetchImpl: respond(status, { type: 'error', error: { type: 'x', message: 'raw' } }) });
    expect(r).toEqual({ ok: false, kind, message: ERROR_MESSAGES[kind] });
  });

  it('401 の文言は設定での確認を案内する', () => {
    expect(ERROR_MESSAGES.auth).toContain('設定');
  });

  it('fetch が投げたらネットワーク断として扱う', async () => {
    const f = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    const r = await callClaude({ apiKey: DUMMY, model: 'm', prompt: 'p', fetchImpl: f });
    expect(r.ok === false && r.kind).toBe('network');
  });

  const hanging: typeof fetch = (_u, init) => new Promise((_res, rej) => {
    init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
  });

  it('60 秒で打ち切りタイムアウトを返す', async () => {
    vi.useFakeTimers();
    const p = callClaude({ apiKey: DUMMY, model: 'm', prompt: 'p', fetchImpl: hanging });
    await vi.advanceTimersByTimeAsync(60_000);
    const r = await p;
    expect(r.ok === false && r.kind).toBe('timeout');
  });

  it('呼び出し側の signal で取り消せる', async () => {
    const ctrl = new AbortController();
    const p = callClaude({ apiKey: DUMMY, model: 'm', prompt: 'p', fetchImpl: hanging, signal: ctrl.signal });
    ctrl.abort();
    const r = await p;
    expect(r.ok === false && r.kind).toBe('cancelled');
  });

  it('本文が空なら成功扱いにしない', async () => {
    const r = await callClaude({ apiKey: DUMMY, model: 'm', prompt: 'p', fetchImpl: respond(200, { content: [] }) });
    expect(r.ok).toBe(false);
  });
});
