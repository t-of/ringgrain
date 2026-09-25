// node tools/test.mjs — 決まりの自己チェック（1 日の区切り・うるう年・読み込み・書き出し・付けなかった日）
import assert from 'node:assert/strict';
import * as L from '../logic.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log(`ok ${name}`); };
const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min);

test('1 日の区切り: 3:59 は前の日、4:00 はその日', () => {
  assert.equal(L.dayKey(at(2026, 9, 25, 3, 59)), '2026-09-24');
  assert.equal(L.dayKey(at(2026, 9, 25, 4, 0)), '2026-09-25');
  assert.equal(L.dayKey(at(2026, 9, 25, 0, 30)), '2026-09-24');
  assert.equal(L.dayKey(at(2026, 9, 25, 23, 59)), '2026-09-25');
});

test('1 日の区切り: 月・年の境目、うるう年の 2 月 29 日', () => {
  assert.equal(L.dayKey(at(2026, 10, 1, 3, 59)), '2026-09-30');
  assert.equal(L.dayKey(at(2027, 1, 1, 3, 59)), '2026-12-31');
  assert.equal(L.dayKey(at(2027, 1, 1, 4, 0)), '2027-01-01');
  assert.equal(L.dayKey(at(2026, 3, 1, 1, 0)), '2026-02-28');
  assert.equal(L.dayKey(at(2028, 3, 1, 1, 0)), '2028-02-29');
  assert.equal(L.dayKey(at(2028, 2, 29, 4, 0)), '2028-02-29');
});

test('うるう年: 2 月は 29 等分（2028・2000）、ふつうの年は 28（2026・2100）', () => {
  assert.equal(L.daysInMonth(2028, 1), 29);
  assert.equal(L.daysInMonth(2000, 1), 29);
  assert.equal(L.daysInMonth(2026, 1), 28);
  assert.equal(L.daysInMonth(2100, 1), 28);
  // 2 月の輪で、12 時のすぐ左（1 周の終わり）を押すとその月の最後の日
  const R = 100, rp = R * L.PITH, w = (R - rp) / 12;
  const r = rp + w * 1.5;
  assert.deepEqual(L.hitTest(-0.01, -r, R, 2028), { m: 1, d: 29 });
  assert.deepEqual(L.hitTest(-0.01, -r, R, 2026), { m: 1, d: 28 });
  assert.deepEqual(L.hitTest(0.01, -r, R, 2028), { m: 1, d: 1 });
  // 真下（半周）は 29 日の月なら 15 日
  assert.deepEqual(L.hitTest(0, r, R, 2028), { m: 1, d: 15 });
  // 1 月がいちばん内側、12 月がいちばん外側。髄と外は null
  assert.equal(L.hitTest(0.01, -(rp + w * 0.5), R, 2026).m, 0);
  assert.equal(L.hitTest(0.01, -(R - 0.5), R, 2026).m, 11);
  assert.equal(L.hitTest(0, -rp * 0.5, R, 2026), null);
  assert.equal(L.hitTest(0, -R * 1.1, R, 2026), null);
  // 年の途中（輪が 9 本ぶん）: いちばん外は 9 月
  assert.equal(L.hitTest(0.01, -(R - 0.5), R, 2026, 9).m, 8);
});

test('日付の形: ない日と形の違うものは受け付けない', () => {
  assert.ok(L.isValidKey('2028-02-29'));
  for (const k of ['2026-02-29', '2026-13-01', '2026-00-10', '2026-9-1', '2026-09-31', '20260925', 5, null]) {
    assert.ok(!L.isValidKey(k), String(k));
  }
});

test('付けなかった日とはじめる前の日の区別、今日と先の日', () => {
  let d = L.emptyData();
  assert.equal(L.dayState(d, '2026-09-01', '2026-09-25'), 'before');   // 何も記録していない
  d = L.setDay(d, '2026-09-20', 1);
  assert.equal(d.first, '2026-09-20');
  assert.equal(L.dayState(d, '2026-09-19', '2026-09-25'), 'before');
  assert.equal(L.dayState(d, '2026-09-20', '2026-09-25'), 1);
  assert.equal(L.dayState(d, '2026-09-21', '2026-09-25'), 'gap');
  assert.equal(L.dayState(d, '2026-09-25', '2026-09-25'), 'today');
  assert.equal(L.dayState(d, '2026-09-26', '2026-09-25'), 'future');
  // 前の日を付け直すと first も前に動く。消しても first は残る
  d = L.setDay(d, '2026-09-10', 0);
  assert.equal(d.first, '2026-09-10');
  d = L.clearDay(d, '2026-09-10');
  assert.equal(d.first, '2026-09-10');
  assert.equal(L.dayState(d, '2026-09-10', '2026-09-25'), 'gap');
});

test('月のまとめ: 色ごとの日数と記録した日数', () => {
  let d = L.emptyData();
  d = L.setDay(d, '2028-02-01', 0);
  d = L.setDay(d, '2028-02-29', 4);
  d = L.setDay(d, '2028-02-15', 4);
  d = L.setDay(d, '2028-03-01', 2);
  assert.deepEqual(L.monthSummary(d, 2028, 1), { counts: [1, 0, 0, 0, 2], logged: 3, days: 29 });
});

test('保存データ: 壊れたもの・知らない項目は捨てる。版の分からないものも days は引き継ぐ', () => {
  assert.deepEqual(L.normalize(null), L.emptyData());
  assert.deepEqual(L.normalize('x'), L.emptyData());
  const raw = { v: 1, first: 'bad', extra: 1, days: { '2026-09-25': 1, '2026-02-30': 1, '2026-09-24': 7, '2026-09-23': '2', '2026-09-22': 1.5 } };
  assert.deepEqual(L.normalize(raw), { v: 1, first: '2026-09-25', days: { '2026-09-25': 1 } });
  assert.deepEqual(L.normalize({ days: { '2026-01-02': 3 } }), { v: 1, first: '2026-01-02', days: { '2026-01-02': 3 } });
});

test('読み込み: 形の違うファイルを捨て、正しい日だけ数える', () => {
  for (const bad of ['', 'not json', '[]', '{}', '{"app":"other","days":{"2026-09-25":1}}',
    '{"app":"ringgrain","days":[1,2]}', '{"app":"ringgrain","days":{"2026-02-30":1,"2026-09-25":9}}']) {
    assert.equal(L.parseImport(bad), null, bad);
  }
  const imp = L.parseImport(JSON.stringify({ app: 'ringgrain', v: 1, days: { '2026-09-25': 1, '2026-09-24': 'x', '2026-09-23': 0 } }));
  assert.equal(imp.count, 2);
  assert.equal(imp.first, '2026-09-23');
});

test('読み込み: 同じ日は読み込んだ方になり、ほかの日は残る', () => {
  let d = L.emptyData();
  d = L.setDay(d, '2026-09-25', 4);
  d = L.setDay(d, '2026-09-26', 2);
  const imp = L.parseImport(JSON.stringify({ app: 'ringgrain', v: 1, first: '2026-08-01', days: { '2026-09-25': 0, '2026-08-01': 3 } }));
  const m = L.mergeImport(d, imp);
  assert.deepEqual(m.days, { '2026-09-25': 0, '2026-09-26': 2, '2026-08-01': 3 });
  assert.equal(m.first, '2026-08-01');
});

test('書き出して読み込むと元と同じ（数か月ぶん、うるう年をまたぐ）', () => {
  let d = L.emptyData();
  for (let i = 0; i < 400; i++) {
    const x = new Date(2027, 10, 1 + i);
    if (i % 7 === 3) continue;   // 付けなかった日
    d = L.setDay(d, L.keyOf(x.getFullYear(), x.getMonth(), x.getDate()), i % 5);
  }
  const text = JSON.stringify(L.exportData(d, at(2028, 12, 5, 22, 10)));
  const obj = JSON.parse(text);
  assert.equal(obj.app, 'ringgrain');
  assert.equal(obj.v, 1);
  assert.match(obj.exported, /^2028-12-05T22:10:00[+-]\d{2}:\d{2}$/);
  const back = L.mergeImport(L.emptyData(), L.parseImport(text));
  assert.deepEqual(back, d);
  assert.ok('2028-02-29' in back.days);
  // 保存データとして読み直しても同じ
  assert.deepEqual(L.normalize(JSON.parse(JSON.stringify(d))), d);
});

console.log(`\n${n} 件すべて合格`);
