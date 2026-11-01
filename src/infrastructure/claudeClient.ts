// Claude Messages API をブラウザから直接呼ぶ。SDK を入れず fetch だけで済ませる（依存を増やさない）
export const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';
export const TIMEOUT_MS = 60_000;

export type ClaudeErrorKind = 'auth' | 'rate_limit' | 'server' | 'network' | 'timeout' | 'cancelled' | 'bad_request' | 'refusal';
export type ClaudeResult =
  | { ok: true; text: string }
  | { ok: false; kind: ClaudeErrorKind; message: string };

// 利用者向けの文言と次の行動を 1 行で出す。API の生の文面はキーや内部情報を含みうるので表示しない
export const ERROR_MESSAGES: Record<ClaudeErrorKind, string> = {
  auth: 'API キーが正しくありません。設定の「AI 接続」でキーを確認してください。',
  rate_limit: '短時間に呼び出しが集中しています。1 分ほど待ってから再度お試しください。',
  server: 'AI 側で一時的な障害が起きています。時間をおいて再度お試しするか、手動コピーで進めてください。',
  network: 'ネットワークに接続できません。通信状態を確認してから再度お試しください。',
  timeout: '60 秒以内に応答がありませんでした。再度お試しするか、手動コピーで進めてください。',
  cancelled: '問い合わせを取り消しました。',
  refusal: 'AI がこの問い合わせへの回答を控えました。仮説の文面を見直すか、手動コピーで進めてください。',
  bad_request: 'AI が要求を受け付けませんでした。設定でモデルを変えるか、手動コピーで進めてください。',
};

const fail = (kind: ClaudeErrorKind): ClaudeResult => ({ ok: false, kind, message: ERROR_MESSAGES[kind] });

export const kindFromStatus = (status: number): ClaudeErrorKind => {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  // 529 は overloaded。5xx と同じく待てば回復する
  if (status >= 500) return 'server';
  return 'bad_request';
};

type ContentBlock = { type: string; text?: string };

const extractText = (body: unknown): string => {
  if (typeof body !== 'object' || body === null || !('content' in body)) return '';
  const content = (body as { content: unknown }).content;
  if (!Array.isArray(content)) return '';
  return (content as ContentBlock[])
    .filter(b => b.type === 'text' && typeof b.text === 'string')
    .map(b => b.text)
    .join('\n')
    .trim();
};

export type CallClaudeInput = {
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const buildRequest = (input: CallClaudeInput, signal: AbortSignal): RequestInit => ({
  method: 'POST',
  signal,
  headers: {
    'content-type': 'application/json',
    'x-api-key': input.apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    // ブラウザからの直接呼び出し（CORS）を明示的に許可するヘッダー。キーは利用者自身の端末にしか無い前提
    'anthropic-dangerous-direct-browser-access': 'true',
  },
  body: JSON.stringify({
    model: input.model,
    max_tokens: input.maxTokens ?? 1024,
    messages: [{ role: 'user', content: input.prompt }],
  }),
});

export const callClaude = async (input: CallClaudeInput): Promise<ClaudeResult> => {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, input.timeoutMs ?? TIMEOUT_MS);
  const onCancel = () => ctrl.abort();
  input.signal?.addEventListener('abort', onCancel);
  if (input.signal?.aborted) ctrl.abort();
  try {
    const res = await (input.fetchImpl ?? fetch)(CLAUDE_ENDPOINT, buildRequest(input, ctrl.signal));
    if (!res.ok) return fail(kindFromStatus(res.status));
    const body: unknown = await res.json();
    // 安全上の理由で回答を止めた応答は、部分的な文面があっても取り込まない
    if (typeof body === 'object' && body !== null && (body as { stop_reason?: unknown }).stop_reason === 'refusal') return fail('refusal');
    const text = extractText(body);
    return text ? { ok: true, text } : fail('bad_request');
  } catch {
    if (timedOut) return fail('timeout');
    if (ctrl.signal.aborted) return fail('cancelled');
    return fail('network');
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener('abort', onCancel);
  }
};

// 接続確認は最小のトークンで済ませる（従量課金のため）
export const testClaudeConnection = (apiKey: string, model: string, fetchImpl?: typeof fetch): Promise<ClaudeResult> =>
  callClaude({ apiKey, model, prompt: 'OK とだけ返してください。', maxTokens: 8, fetchImpl });
