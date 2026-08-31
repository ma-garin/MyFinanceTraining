const TOKEN_KEY = 'mft_jquants_refresh_token';
const ID_TOKEN_KEY = 'mft_jquants_id_token';

export type CachedIdToken = { token: string; expiresAt: number };

// 認証情報は端末内にのみ置く。このアプリはサーバーを持たないため外部には出ない。
export const loadRefreshToken = (): string => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
};

export const saveRefreshToken = (token: string): void => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('jquantsStorage save failed:', err);
  }
};

// IDトークンは24時間有効。毎回取り直すと無駄な認証リクエストが増えるので
// 期限まではキャッシュする（余裕を持って1時間手前で失効扱い）。
export const loadIdToken = (): string | null => {
  try {
    const raw = localStorage.getItem(ID_TOKEN_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedIdToken;
    return cached.expiresAt > Date.now() ? cached.token : null;
  } catch {
    return null;
  }
};

export const saveIdToken = (token: string): void => {
  try {
    const entry: CachedIdToken = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
    localStorage.setItem(ID_TOKEN_KEY, JSON.stringify(entry));
  } catch (err) {
    console.error('jquantsStorage save failed:', err);
  }
};

export const clearIdToken = (): void => {
  try {
    localStorage.removeItem(ID_TOKEN_KEY);
  } catch {
    // 消せなくても致命的ではない
  }
};
