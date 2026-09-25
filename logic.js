// RINGGRAIN の決まりごと。画面（DOM）に触らない部分をここに集める。
// main.js（ブラウザ）と tools/test.mjs（node）から読む。
//
// 記録の形（ringgrain.days）: { v: 1, first: 'YYYY-MM-DD' | null, days: { 'YYYY-MM-DD': 0〜4 } }
//   気分は 0 = 最高 … 4 = つらい。first ははじめて記録した日（その日より前は「木の地」で塗る）。
//   形を変えるときは VERSION を上げ、normalize() の中で古い形から今の形に直す。

export const VERSION = 1;
export const APP = 'ringgrain';
export const DAY_START_HOUR = 4;   // 1 日の区切り。0 時〜4 時は前の日
export const PITH = 0.13;          // 髄の半径（切り株の半径に対する割合）

const pad = (x) => String(x).padStart(2, '0');

// 月は 0 から（Date と同じ）
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return [y, m - 1, d]; };

// 午前 4 時で区切った日付。時刻を引き算せず Date の繰り下がりに任せる（月・年の境目と夏時間もこれで合う）
export function dayKey(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - DAY_START_HOUR);
  return keyOf(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isValidKey(k) {
  if (typeof k !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
  const [y, m, d] = parseKey(k);
  return m >= 0 && m <= 11 && d >= 1 && d <= daysInMonth(y, m);
}
const isMood = (v) => Number.isInteger(v) && v >= 0 && v <= 4;

export const emptyData = () => ({ v: VERSION, first: null, days: {} });

function cleanDays(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) if (isValidKey(k) && isMood(v)) out[k] = v;
  return out;
}
const minKey = (keys) => keys.filter(isValidKey).sort()[0] ?? null;

// 保存されていたもの（何でもよい）を今の形にする。知らない項目は捨てる。
// v: 1 が今の形。版が分からなくても days の形が合っていれば読む（記録を消さないため）
export function normalize(raw) {
  if (!raw || typeof raw !== 'object') return emptyData();
  const days = cleanDays(raw.days);
  const first = minKey([raw.first, ...Object.keys(days)]);
  return { v: VERSION, first, days };
}

export function setDay(data, key, mood) {
  const days = { ...data.days, [key]: mood };
  return { v: VERSION, first: minKey([data.first, key]), days };
}
export function clearDay(data, key) {
  const days = { ...data.days };
  delete days[key];
  return { v: VERSION, first: data.first, days };
}

// その日の見え方: 0〜4（記録した色）/ 'today'（今日でまだ）/ 'gap'（付けなかった）/ 'before'（はじめる前）/ 'future'
export function dayState(data, key, today) {
  if (key > today) return 'future';
  const v = data.days[key];
  if (v != null) return v;
  if (key === today) return 'today';
  if (!data.first || key < data.first) return 'before';
  return 'gap';
}

export function monthSummary(data, y, m) {
  const counts = [0, 0, 0, 0, 0];
  const n = daysInMonth(y, m);
  for (let d = 1; d <= n; d++) {
    const v = data.days[keyOf(y, m, d)];
    if (v != null) counts[v]++;
  }
  return { counts, logged: counts.reduce((a, b) => a + b, 0), days: n };
}

// 切り株の中心から (dx, dy) の点が、どの月のどの日か。外れなら null。
// 半径 R の中に rings 本ぶんの輪を同じ幅でとる（年の途中は、育った分が画面いっぱいになるよう rings を減らす）。
// 1 月がいちばん内側。1 周をその月の日数で等分し、12 時から時計回り
export function hitTest(dx, dy, R, year, rings = 12) {
  const r = Math.hypot(dx, dy);
  const rp = R * PITH;
  if (r < rp || r > R) return null;
  const m = Math.floor((r - rp) / ((R - rp) / rings));
  if (m > 11) return null;
  let a = Math.atan2(dx, -dy);
  if (a < 0) a += Math.PI * 2;
  const n = daysInMonth(year, m);
  return { m, d: Math.min(n, Math.floor(a / (Math.PI * 2) * n) + 1) };
}

// ---- 書き出し・読み込み ----

export function isoLocal(now = new Date()) {
  const off = -now.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const a = Math.abs(off);
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}

export function exportData(data, now = new Date()) {
  return { app: APP, v: VERSION, exported: isoLocal(now), first: data.first, days: data.days };
}

// 読み込むファイルの中身を確かめる。形が違えば null（何も変えない）
export function parseImport(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return null; }
  if (!obj || typeof obj !== 'object' || obj.app !== APP) return null;
  if (!obj.days || typeof obj.days !== 'object' || Array.isArray(obj.days)) return null;
  const days = cleanDays(obj.days);
  const count = Object.keys(days).length;
  if (count === 0) return null;
  return { first: minKey([obj.first, ...Object.keys(days)]), days, count };
}

// 同じ日は読み込んだ方になる
export function mergeImport(data, imp) {
  const days = { ...data.days, ...imp.days };
  return { v: VERSION, first: minKey([data.first, imp.first, ...Object.keys(imp.days)]), days };
}
