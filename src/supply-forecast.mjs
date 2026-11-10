// 앞으로 N일 게시 가능 수 예측 (게시 파이프라인 밖, 읽기만) — 2026-11-11 in-1110-1 셀프 개선
//   node src/supply-forecast.mjs [일수=21] [--pick 21]
// 오늘 data/raw 의 후보(gear·pick)와 data/state.json 으로, 반복 금지(plan.mjs repeatDays)와
// 하루 한도(DAILY_MAX)를 그대로 적용해 날마다 몇 개가 나갈 수 있는지 흉내 낸다(투어 결과는 미래를 몰라 뺌).
// 고르는 순서는 choose() 를 그대로 쓴다. --pick N 은 pick 반복 금지를 N일로 바꿨을 때의 가정 계산(코드는 안 바꿈).
import { readdirSync } from 'node:fs';
import { DAILY_MAX, KIND_CYCLE, baseId, candidates, loadRaw, postedToday, repeatDays } from './plan.mjs';
import { daysBetween, readJson } from './util.mjs';

const args = process.argv.slice(2);
const days = Number(args.find((a) => /^\d+$/.test(a)) || 21);
const pi = args.indexOf('--pick');
const pickDays = pi >= 0 ? Number(args[pi + 1]) : null;
const rd = (kind) => (kind === 'pick' && pickDays ? pickDays : repeatDays(kind));

const rawRoot = new URL('../data/raw/', import.meta.url);
const today = readdirSync(rawRoot).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().pop();
const raw = loadRaw(new URL(`${today}/`, rawRoot));
const state0 = readJson(new URL('../data/state.json', import.meta.url));
const state = { posted: { ...state0.posted }, history: [...(state0.history || [])], lastGearKind: state0.lastGearKind };

// choose() 와 같은 규칙(투어 제외), 반복 금지만 rd() 로
function pickOne(list, date) {
  if (postedToday(state, date).length >= DAILY_MAX) return null;
  const recent = (p) => { const last = state.posted[baseId(p.id)]; return last && daysBetween(last, date) < rd(p.kind); };
  const todayCats = new Set(postedToday(state, date).map((h) => h.category).filter(Boolean));
  const gear = list.filter((p) => p.kind !== 'tour' && !recent(p));
  const last = KIND_CYCLE.indexOf(state.lastGearKind);
  for (let i = 0; i < KIND_CYCLE.length; i++) {
    const pool = gear.filter((p) => p.kind === KIND_CYCLE[(last + 1 + i) % KIND_CYCLE.length]);
    const p = pool.find((x) => !todayCats.has(x.category)) || pool[0];
    if (p) return p;
  }
  return gear[0] || null;
}

const addDay = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const rows = [];
for (let i = 0; i < days; i++) {
  const date = addDay(today, i);
  const list = candidates(raw, date).filter((p) => p.kind !== 'tour');
  const before = postedToday(state, date).length;
  const got = [];
  for (let p; (p = pickOne(list, date)); ) {
    state.posted[baseId(p.id)] = date;
    state.history.push({ date, id: p.id, kind: p.kind, category: p.category });
    state.lastGearKind = p.kind;
    got.push(p.kind);
  }
  rows.push({ date, before, got });
}
const dow = (d) => '일월화수목금토'[new Date(`${d}T12:00:00+09:00`).getUTCDay()];
console.log(`## 게시 가능 수 예측 (${today}부터 ${days}일, 하루 최대 ${DAILY_MAX}, 반복 금지 pick ${rd('pick')}일 · compare ${rd('compare')}일 · tips ${rd('tips')}일${pickDays ? ' — pick 가정값' : ''})`);
console.log('| 날짜 | 이미 올림 | 더 나갈 수 있음 | 종류 |\n|---|---|---|---|');
for (const r of rows) {
  const c = {}; for (const k of r.got) c[k] = (c[k] || 0) + 1;
  console.log(`| ${r.date.slice(5)}(${dow(r.date)}) | ${r.before} | ${r.got.length} | ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(' · ') || '-'} |`);
}
const short = rows.filter((r) => r.before + r.got.length < DAILY_MAX);
console.log(`\n- 한도(${DAILY_MAX}) 못 채우는 날: ${short.length}일${short.length ? ` (${short.map((r) => `${r.date.slice(5)} ${r.before + r.got.length}개`).join(', ')})` : ''}`);
console.log('- 투어 결과(대회 끝난 뒤 4일 안)는 빠져 있다 — 실제로는 그만큼 더 나갈 수 있다(한도 안에서).');
