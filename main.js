import * as L from './logic.js';

// localStorage はほかのアプリと共有される（同じ t-of.github.io のため）。
// キーは必ず 'ringgrain.' で始める。
const STORE = 'ringgrain.';

function load(key, fallback) {
  try {
    const v = localStorage.getItem(STORE + key);
    return v == null ? fallback : JSON.parse(v);
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(STORE + key, JSON.stringify(value)); } catch { /* 保存できなくても使える */ }
}
function remove(key) {
  try { localStorage.removeItem(STORE + key); } catch { /* 何もできない */ }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

// 音を使うときは、鳴らす前と音の設定を切り替えたときにこれを呼ぶ（RULES.md §5「音」）。
function setAudioSession(soundOn) {
  try { if (navigator.audioSession) navigator.audioSession.type = soundOn ? 'playback' : 'auto'; } catch { /* 対応していない */ }
}

// ---------- 言葉（仕様 13 の一覧。[日本語, English]） ----------

const STR = {
  'tagline': ['毎日の気分が年輪になる', 'Your moods, grown into tree rings'],
  'today.ask': ['{date}の気分は？', 'How was {date}?'],
  'today.done': ['今日: {mood}', 'Today: {mood}'],
  'mood.0': ['最高', 'Great'],
  'mood.1': ['いい', 'Good'],
  'mood.2': ['ふつう', 'Okay'],
  'mood.3': ['いまいち', 'Low'],
  'mood.4': ['つらい', 'Rough'],
  'year.prev': ['前の年', 'Previous year'],
  'year.next': ['次の年', 'Next year'],
  'day.title': ['{date}', '{date}'],
  'day.clear': ['この日を消す', 'Clear this day'],
  'day.none': ['記録なし', 'Not logged'],
  'month.count': ['{n} / {days} 日', '{n} of {days} days'],
  'btn.image': ['画像で保存', 'Save image'],
  'btn.share': ['共有', 'Share'],
  'btn.settings': ['設定', 'Settings'],
  'btn.close': ['閉じる', 'Close'],
  'set.sound': ['音', 'Sound'],
  'set.on': ['オン', 'On'],
  'set.off': ['オフ', 'Off'],
  'set.lang': ['言葉', 'Language'],
  'set.lang.auto': ['自動', 'Auto'],
  'set.export': ['記録を書き出す', 'Export records'],
  'set.import': ['記録を読み込む', 'Import records'],
  'set.import.ask': ['{n} 日ぶんを読み込みます。同じ日は読み込んだ方になります。', 'Import {n} days? Days you already have will be replaced.'],
  'set.import.ok': ['読み込む', 'Import'],
  'set.import.bad': ['読み込めないファイルです', "This file can't be read"],
  'set.delete': ['記録をすべて消す', 'Delete all records'],
  'set.delete.ask': ['本当に消す（元に戻せません）', "Delete for good (can't be undone)"],
  'set.delete.first': ['先に書き出す', 'Export first'],
  'set.privacy': ['記録はこの端末の中だけにあり、どこにも送りません。ブラウザのデータを消すと記録も消えるので、ときどき書き出してください。',
    'Your records stay on this device and are never sent anywhere. Clearing browser data erases them, so export now and then.'],
  'set.ios': ['ホーム画面に追加すると、記録が消えにくくなります', 'Add to Home Screen to keep your records safer'],
  'more.title': ['もっと', 'More'],
  'more.soon': ['近日', 'Soon'],
  'more.soon.msg': ['近日公開', 'Coming soon'],
  'more.colors': ['色と気分の名前を自分で決める', 'Your own colors and names'],
  'more.trends': ['月・曜日ごとの傾向', 'Trends by month and weekday'],
  'more.compare': ['前の年と並べる', 'Compare with past years'],
  'more.poster': ['大きな年輪ポスター', 'High-res ring poster'],
  'coach.1': ['寝る前に、今日の気分の色を 1 つ押す', 'Before bed, tap one color for today'],
  'coach.2': ['1 日ずつ外に帯が足されて、1 か月で 1 周、1 年で 12 本の年輪になる', 'Each day adds a band. A month makes a ring; a year makes twelve.'],
  'coach.ok': ['はじめる', 'Start'],
  'toast.saved': ['保存しました', 'Saved'],
  'toast.exported': ['書き出しました', 'Exported'],
  'toast.imported': ['{n} 日ぶんを読み込みました', 'Imported {n} days'],
  'toast.deleted': ['消しました', 'Deleted'],
  'share.image': ['{year} 年の年輪 #RINGGRAIN', 'My {year} in tree rings #RINGGRAIN'],
  'share.app': ['毎日の気分が年輪になる RINGGRAIN', 'RINGGRAIN — your moods, grown into tree rings'],
  'footer.tof': ['T.OF... のアプリ', 'An app by T.OF...'],
  'wak.install': ['アプリにする', 'Install'],
};

let lang = 'ja';
const t = (key, vars = {}) => STR[key][lang === 'ja' ? 0 : 1].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const nf = () => new Intl.NumberFormat(lang);
const dateOf = (key) => { const [y, m, d] = L.parseKey(key); return new Date(y, m, d); };
const fmtDay = (key) => new Intl.DateTimeFormat(lang, { month: 'long', day: 'numeric', weekday: 'short' }).format(dateOf(key));
const fmtFullDay = (key) => new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(dateOf(key));
const fmtMonth = (y, m) => new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long' }).format(new Date(y, m, 1));

// ---------- 色 ----------

// 明るい方から。白黒にしても順に並ぶ（明るさが段階ごとに下がる）
const MOODS = ['#f4d77a', '#a8cf8e', '#cfae86', '#7d8db3', '#4b3c63'];
const WOOD = '#4a3828';     // はじめる前の日（木の地）
const GAP = '#150e09';      // 付けなかった日（暗いすき間）
const PITH_COLOR = '#2b1b12';
const BARK = '#1d130c';
const BG = '#0e0a07';
const SITE = 'https://t-of.github.io/ringgrain/';

// ---------- 保存 ----------

let data = L.normalize(load('days', null));
const saveData = () => save('days', data);

const settings = (() => {
  const s = load('settings', null) || {};
  return {
    v: 1,
    sound: typeof s.sound === 'boolean' ? s.sound : true,
    lang: ['auto', 'ja', 'en'].includes(s.lang) ? s.lang : 'auto',
    coached: s.coached === true,
    hinted: s.hinted === true,     // iPhone のホーム画面のすすめを出したか
  };
})();
const saveSettings = () => save('settings', settings);

// ---------- 音（Web Audio で作る。夜に使うので小さく、やわらかく） ----------

let ac = null;
function audio() {
  if (!settings.sound) return null;
  setAudioSession(true);
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
  } catch { return null; }
  return ac;
}
function tone(freq, start, dur, vol, type = 'sine') {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}
// 5 音音階。明るい色ほど高い
const PENTA = [880, 783.99, 659.25, 587.33, 523.25];
const sfx = {
  // 木をたたく「コトン」: 正弦波に、4 倍の音をほんの少し
  mood(m, soft = false) {
    tone(PENTA[m], 0, soft ? 0.08 : 0.15, soft ? 0.035 : 0.08);
    tone(PENTA[m] * 4, 0, 0.03, soft ? 0.006 : 0.015);
  },
  ring() { [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.18 + i * 0.15, 0.3, 0.045)); },
  year() { [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.18 + i * 0.17, 0.36, 0.045)); },
  pon() { tone(740, 0, 0.12, 0.05); },
  done() { tone(783.99, 0, 0.1, 0.045); tone(1046.5, 0.1, 0.14, 0.045); },
  erase() { tone(196, 0, 0.2, 0.06, 'triangle'); },
  click() { tone(1400, 0, 0.025, 0.015, 'triangle'); },
};

// ---------- 画面の部品 ----------

const $ = (id) => document.getElementById(id);
const canvas = $('stump');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let today = L.dayKey();
let viewYear = +today.slice(0, 4);
let anim = null;      // 帯が伸びる動き { key, t0 }
let sheetKey = null;  // 開いているその日のシート

function moodButtons(el, onPick) {
  el.replaceChildren(...MOODS.map((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mood';
    b.dataset.m = i;
    b.innerHTML = `<span class="mood__dot" style="background:${c}"></span><span class="mood__name"></span>`;
    b.addEventListener('click', () => onPick(i));
    return b;
  }));
}
function paintMoods(el, current) {
  el.querySelectorAll('.mood').forEach((b) => {
    const i = +b.dataset.m;
    b.querySelector('.mood__name').textContent = t(`mood.${i}`);
    b.setAttribute('aria-pressed', String(current === i));
  });
}

moodButtons($('moods'), (m) => record(today, m));
moodButtons($('day-moods'), (m) => { if (sheetKey) record(sheetKey, m); });

// ---------- 記録 ----------

function record(key, mood) {
  const prev = data.days[key];
  const firstEver = !data.first;
  data = L.setDay(data, key, mood);
  saveData();
  if (prev == null) {
    anim = reduced.matches ? null : { key, t0: performance.now() };
    sfx.mood(mood);
    const [y, m, d] = L.parseKey(key);
    if (d === L.daysInMonth(y, m)) (m === 11 ? sfx.year : sfx.ring)();
  } else {
    sfx.mood(mood, true);
  }
  if (firstEver) navigator.storage?.persist?.().catch(() => {});
  if (Object.keys(data.days).length >= 3 && iosBrowser() && !settings.hinted) {
    settings.hinted = true;
    saveSettings();
    setTimeout(() => WebAppKit.toast(t('set.ios')), 700);
  }
  render();
}

function iosBrowser() {
  return WebAppKit.platform.isIOS && !WebAppKit.isStandalone();
}

// ---------- 切り株を描く ----------

const angle = (frac) => -Math.PI / 2 + frac * Math.PI * 2;   // 12 時から時計回り

function wedge(ctx, cx, cy, r0, r1, a0, a1) {
  ctx.beginPath();
  ctx.arc(cx, cy, r1, a0, a1);
  ctx.arc(cx, cy, r0, a1, a0, true);
  ctx.closePath();
}

// 描く輪の本数。前の年は 12 本。今年は育った分（今月まで）が R いっぱいになるようにする。
// 1 月に 1 本だけが大きくなりすぎないよう、少なくとも 4 本ぶんの幅でとる
function ringsShown(year) {
  const ty = +today.slice(0, 4);
  return year < ty ? 12 : Math.max(4, L.parseKey(today)[1] + 1);
}

// opts: { outline: まだ来ていない日の輪郭と今日のふちどりを描くか, now }
function drawStump(ctx, cx, cy, R, year, opts = {}) {
  const rp = R * L.PITH;
  const w = (R - rp) / ringsShown(year);
  const ty = +today.slice(0, 4);
  const [, tm, td] = L.parseKey(today);
  const lastM = year < ty ? 11 : year === ty ? tm : -1;
  const line = Math.max(1, R / 170);

  for (let m = 0; m <= lastM; m++) {
    const n = L.daysInMonth(year, m);
    const r0 = rp + m * w;
    const r1 = r0 + w;
    for (let d = 1; d <= n; d++) {
      const key = L.keyOf(year, m, d);
      const st = L.dayState(data, key, today);
      if (st === 'future' || st === 'today') continue;
      let top = r1;
      if (anim && anim.key === key) {
        const k = Math.min(1, (opts.now - anim.t0) / 400);
        top = r0 + w * (1 - (1 - k) ** 3);
      }
      ctx.fillStyle = typeof st === 'number' ? MOODS[st] : st === 'before' ? WOOD : GAP;
      // 隣の帯とのすき間が細く光らないよう、ほんの少し重ねる
      wedge(ctx, cx, cy, r0, top, angle((d - 1) / n), angle(d / n) + 0.004);
      ctx.fill();
    }
    // 木目: 輪の外側に濃い筋（晩材）、中にうすい筋
    ctx.lineWidth = Math.max(1, w * 0.1);
    ctx.strokeStyle = 'rgba(20, 10, 4, 0.45)';
    ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = line * 0.6;
    ctx.strokeStyle = 'rgba(20, 10, 4, 0.12)';
    for (const f of [0.35, 0.65]) { ctx.beginPath(); ctx.arc(cx, cy, r0 + w * f, 0, Math.PI * 2); ctx.stroke(); }
  }

  // 髄と年の数字
  ctx.fillStyle = PITH_COLOR;
  ctx.beginPath(); ctx.arc(cx, cy, rp + 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(236, 222, 200, 0.7)';
  ctx.font = `600 ${Math.round(rp * 0.52)}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(year), cx, cy + rp * 0.03);

  if (year === ty && opts.outline) {
    // 今月の残りを、ごく薄い線で
    const n = L.daysInMonth(ty, tm);
    const r0 = rp + tm * w;
    const done = data.days[today] != null;
    const a0 = angle((td - (done ? 0 : 1)) / n);
    if (!done || td < n) {
      ctx.strokeStyle = 'rgba(236, 222, 200, 0.16)';
      ctx.lineWidth = line;
      ctx.beginPath(); ctx.arc(cx, cy, r0 + w, a0, angle(1)); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r0, a0, angle(1)); ctx.stroke();
    }
    // 今日の帯: ゆっくり明滅するふちどり
    const p = reduced.matches ? 1 : 0.55 + 0.45 * Math.sin((opts.now || 0) / 700);
    ctx.strokeStyle = `rgba(255, 243, 201, ${0.35 + 0.6 * p})`;
    ctx.lineWidth = line * 1.6;
    wedge(ctx, cx, cy, r0, r0 + w, angle((td - 1) / n), angle(td / n));
    ctx.stroke();
  }

  // いちばん外（今育っているところ）に細い樹皮の輪
  const outer = rp + (lastM + 1) * w;
  ctx.strokeStyle = BARK;
  ctx.lineWidth = R * 0.022;
  ctx.beginPath(); ctx.arc(cx, cy, outer + R * 0.011, 0, Math.PI * 2); ctx.stroke();
}

// 画面の大きさ（CSS の px）。R はいちばん外の輪の外側
const stumpGeom = () => { const s = canvas.clientWidth; return { s, R: s / 2 * 0.95 }; };

let raf = 0;
function frame(now) {
  raf = 0;
  const { s, R } = stumpGeom();
  if (!s) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  if (canvas.width !== Math.round(s * dpr)) { canvas.width = canvas.height = Math.round(s * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, s, s);
  drawStump(ctx, s / 2, s / 2, R, viewYear, { outline: true, now });
  if (anim && now - anim.t0 > 420) anim = null;
  const live = !reduced.matches && !document.hidden && (anim || viewYear === +today.slice(0, 4));
  if (live) raf = requestAnimationFrame(frame);
}
function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }

new ResizeObserver(requestDraw).observe(canvas);
document.addEventListener('visibilitychange', () => { tick(); requestDraw(); });

// 帯をタップ → その日のシート
canvas.addEventListener('click', (e) => {
  const { s, R } = stumpGeom();
  const rect = canvas.getBoundingClientRect();
  const hit = L.hitTest(e.clientX - rect.left - s / 2, e.clientY - rect.top - s / 2, R, viewYear, ringsShown(viewYear));
  if (!hit) return;
  const key = L.keyOf(viewYear, hit.m, hit.d);
  if (key > today) return;   // まだ来ていない日は選べない
  sfx.click();
  openDay(key);
});

// ---------- 表示 ----------

function minYear() {
  const ty = +today.slice(0, 4);
  return data.first ? Math.min(ty, +data.first.slice(0, 4)) : ty;
}

function render() {
  const ty = +today.slice(0, 4);
  viewYear = Math.max(minYear(), Math.min(ty, viewYear));
  $('year').textContent = String(viewYear);
  $('prev').disabled = viewYear <= minYear();
  $('next').disabled = viewYear >= ty;
  $('today').classList.toggle('today--away', viewYear !== ty);
  const v = data.days[today];
  $('ask').textContent = t('today.ask', { date: fmtDay(today) });
  $('done').textContent = v != null ? t('today.done', { mood: t(`mood.${v}`) }) : '';
  paintMoods($('moods'), v);
  $('coach').hidden = settings.coached;
  if (sheetKey) renderDay();
  renderSettings();
  requestDraw();
}

function applyLang() {
  const nav = (navigator.language || '').toLowerCase();
  lang = settings.lang === 'auto' ? (nav.startsWith('ja') ? 'ja' : 'en') : settings.lang;
  document.documentElement.lang = lang;
  WebAppKit.init({ lang, title: 'RINGGRAIN', text: t('share.app') });
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-t-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.tLabel)); });
  canvas.setAttribute('aria-label', `RINGGRAIN — ${t('tagline')}`);
  renderMore();
  render();
}

// 0 時〜4 時をまたいでも開きっぱなしのときのため、ときどき「今日」を見直す
function tick() {
  const k = L.dayKey();
  if (k === today) return;
  if (viewYear === +today.slice(0, 4)) viewYear = +k.slice(0, 4);
  today = k;
  render();
}
setInterval(tick, 30000);

$('prev').addEventListener('click', () => { sfx.click(); viewYear--; render(); });
$('next').addEventListener('click', () => { sfx.click(); viewYear++; render(); });
$('coach-ok').addEventListener('click', () => { sfx.click(); settings.coached = true; saveSettings(); render(); });

// ---------- シート（下から出る） ----------

let pendingImport = null;

function openSheet(el) {
  el.hidden = false;
  el.querySelector('.sheet').scrollTop = 0;
  el.querySelector('.sheet').focus({ preventScroll: true });
}
function closeSheet(el) {
  el.hidden = true;
  if (el.id === 'day-sheet') sheetKey = null;
  if (el.id === 'settings-sheet') { $('import-confirm').hidden = true; $('delete-confirm').hidden = true; pendingImport = null; }
}
document.querySelectorAll('.sheet-wrap').forEach((wrap) => {
  const sheet = wrap.querySelector('.sheet');
  wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-close]')) closeSheet(wrap); });
  // 下へ払うと閉じる（中身がいちばん上までスクロールされているときだけ）
  let y0 = null;
  sheet.addEventListener('touchstart', (e) => { y0 = sheet.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
  sheet.addEventListener('touchend', (e) => {
    if (y0 != null && e.changedTouches[0].clientY - y0 > 70) closeSheet(wrap);
    y0 = null;
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.sheet-wrap:not([hidden])').forEach(closeSheet);
});

// その日のシート
function openDay(key) {
  sheetKey = key;
  renderDay();
  openSheet($('day-sheet'));
}
function renderDay() {
  const key = sheetKey;
  const [y, m] = L.parseKey(key);
  const v = data.days[key];
  const editable = y === +today.slice(0, 4);   // 前の年は見るだけ
  $('day-title').textContent = t('day.title', { date: fmtFullDay(key) });
  $('day-state').textContent = v != null ? t(`mood.${v}`) : t('day.none');
  $('day-moods').hidden = !editable;
  paintMoods($('day-moods'), v);
  $('day-clear').hidden = !editable;
  $('day-clear').disabled = v == null;
  $('month-title').textContent = fmtMonth(y, m);
  const sum = L.monthSummary(data, y, m);
  const f = nf();
  $('month-bars').replaceChildren(...sum.counts.map((c, i) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = '<span class="bar-row__name"></span><span class="bar-row__track"><span class="bar-row__fill"></span></span><span class="bar-row__n"></span>';
    row.querySelector('.bar-row__name').textContent = t(`mood.${i}`);
    const fill = row.querySelector('.bar-row__fill');
    fill.style.width = `${(c / sum.days) * 100}%`;
    fill.style.background = MOODS[i];
    row.querySelector('.bar-row__n').textContent = f.format(c);
    return row;
  }));
  $('month-count').textContent = t('month.count', { n: f.format(sum.logged), days: f.format(sum.days) });
}
$('day-clear').addEventListener('click', () => {
  if (!sheetKey || data.days[sheetKey] == null) return;
  data = L.clearDay(data, sheetKey);
  saveData();
  sfx.erase();
  render();
});

// ---------- 設定 ----------

function renderSettings() {
  $('seg-sound').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v === 'on') === settings.sound)));
  $('seg-lang').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === settings.lang)));
  $('ios-hint').hidden = !iosBrowser();
}

const LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/></svg>';
function renderMore() {
  $('more').replaceChildren(...['more.colors', 'more.trends', 'more.compare', 'more.poster'].map((k) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="more__item">${LOCK}<span class="more__name"></span><span class="badge"></span></button>`;
    li.querySelector('.more__name').textContent = t(k);
    li.querySelector('.badge').textContent = t('more.soon');
    li.querySelector('button').addEventListener('click', () => { sfx.click(); WebAppKit.toast(t('more.soon.msg')); });
    return li;
  }));
}

$('open-settings').addEventListener('click', () => { sfx.click(); renderSettings(); openSheet($('settings-sheet')); });

$('seg-sound').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  settings.sound = b.dataset.v === 'on';
  saveSettings();
  setAudioSession(settings.sound);
  sfx.click();
  renderSettings();
});
$('seg-lang').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  settings.lang = b.dataset.v;
  saveSettings();
  sfx.click();
  applyLang();
});

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function exportRecords() {
  const json = JSON.stringify(L.exportData(data), null, 1);
  download(new Blob([json], { type: 'application/json' }), `ringgrain-${today}.json`);
  sfx.done();
  WebAppKit.toast(t('toast.exported'));
}
$('export').addEventListener('click', exportRecords);
$('delete-export').addEventListener('click', exportRecords);

$('import').addEventListener('click', () => { sfx.click(); $('file').value = ''; $('file').click(); });
$('file').addEventListener('change', async () => {
  const file = $('file').files[0];
  if (!file) return;
  // 1 年で 6KB ほど。大きすぎるものは記録のファイルではない
  const imp = file.size > 5_000_000 ? null : L.parseImport(await file.text().catch(() => ''));
  if (!imp) { pendingImport = null; $('import-confirm').hidden = true; WebAppKit.toast(t('set.import.bad')); return; }
  pendingImport = imp;
  $('import-ask').textContent = t('set.import.ask', { n: nf().format(imp.count) });
  $('import-confirm').hidden = false;
  $('delete-confirm').hidden = true;
});
$('import-cancel').addEventListener('click', () => { pendingImport = null; $('import-confirm').hidden = true; });
$('import-ok').addEventListener('click', () => {
  if (!pendingImport) return;
  const n = pendingImport.count;
  data = L.mergeImport(data, pendingImport);
  saveData();
  pendingImport = null;
  $('import-confirm').hidden = true;
  sfx.done();
  WebAppKit.toast(t('toast.imported', { n: nf().format(n) }));
  render();
});

$('delete').addEventListener('click', () => {
  sfx.click();
  $('delete-confirm').hidden = !$('delete-confirm').hidden;
  $('import-confirm').hidden = true;
});
$('delete-ok').addEventListener('click', () => {
  data = L.emptyData();
  remove('days');   // 設定（音・言葉）は残す
  $('delete-confirm').hidden = true;
  viewYear = +today.slice(0, 4);
  sfx.erase();
  WebAppKit.toast(t('toast.deleted'));
  render();
});

// ---------- 画像で保存（1080×1350） ----------

function makeImage(year) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 620, 60, W / 2, 620, 620);
  glow.addColorStop(0, 'rgba(58, 40, 26, 0.55)');
  glow.addColorStop(1, 'rgba(58, 40, 26, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const font = 'system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#eee3d2';
  ctx.font = `300 76px ${font}`;
  ctx.fillText(String(year), W / 2, 150);

  drawStump(ctx, W / 2, 620, 410, year, {});

  // 5 色の見本と名前（日数は入れない）
  ctx.textBaseline = 'alphabetic';
  MOODS.forEach((col, i) => {
    const x = W / 2 + (i - 2) * 190;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, 1135, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8ccb9';
    ctx.font = `500 30px ${font}`;
    ctx.textAlign = 'center';
    ctx.fillText(t(`mood.${i}`), x, 1200);
  });

  ctx.fillStyle = 'rgba(216, 204, 185, 0.6)';
  ctx.font = `600 26px ${font}`;
  ctx.textAlign = 'left';
  ctx.fillText('RINGGRAIN', 60, H - 56);
  ctx.textAlign = 'right';
  ctx.font = `400 26px ${font}`;
  ctx.fillText('t-of.github.io/ringgrain', W - 60, H - 56);
  return c;
}

$('save-image').addEventListener('click', async () => {
  const year = viewYear;
  // toBlob（非同期）を待つと、Safari で共有シートを開く許可が切れることがあるので、その場で作る
  const bin = atob(makeImage(year).toDataURL('image/png').split(',')[1]);
  const blob = new Blob([Uint8Array.from(bin, (ch) => ch.charCodeAt(0))], { type: 'image/png' });
  const name = `ringgrain-${year}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  sfx.pon();
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: `${t('share.image', { year })} ${SITE}` });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  download(blob, name);
  WebAppKit.toast(t('toast.saved'));
});

// ---------- はじめ ----------

if (!settings.sound) setAudioSession(false);
reduced.addEventListener?.('change', requestDraw);
applyLang();
