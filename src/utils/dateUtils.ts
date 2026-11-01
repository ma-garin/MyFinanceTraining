// 利用者は日本在住が前提。端末 TZ や UTC(toISOString) に依存すると 0〜9 時に前日へずれる（BUG-04）
const TOKYO_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
});

export const toTokyoDateStr = (d: Date): string => TOKYO_DATE.format(d);

export const todayStr = (now: Date = new Date()): string => toTokyoDateStr(now);

export const monthStr = (now: Date = new Date()): string => toTokyoDateStr(now).slice(0, 7);

export const isoToTokyoDateStr = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(0, 10) : toTokyoDateStr(d);
};
