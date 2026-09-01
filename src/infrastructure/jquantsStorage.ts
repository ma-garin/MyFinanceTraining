const API_KEY = 'mft_jquants_api_key';

// APIキーは端末内にのみ置く。このアプリはサーバーを持たないため外部には出ない。
// V2 のAPIキーに有効期限はないので、期限管理やキャッシュは不要。
export const loadApiKey = (): string => {
  try {
    return localStorage.getItem(API_KEY) ?? '';
  } catch {
    return '';
  }
};

export const saveApiKey = (key: string): void => {
  try {
    if (key) localStorage.setItem(API_KEY, key);
    else localStorage.removeItem(API_KEY);
  } catch (err) {
    console.error('jquantsStorage save failed:', err);
  }
};
