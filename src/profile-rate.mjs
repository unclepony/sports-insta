// E6(pick 릴스 '계정 이름 누르고 → 프로필 링크', 판단일 2026-11-18) 판정용 표 — 2026-11-13 in-1113-1
//   node src/profile-rate.mjs [시작 YYYY-MM-DD] [끝 YYYY-MM-DD]   기본: E6 기간 2026-11-05 ~ 2026-11-18
// 날마다 하루 값(account.yesterday: 도달·프로필 방문·링크 탭)을 git 기록의 모든 지표 판에서 찾아,
// 그날 값이 들어 있는 판 중 **가장 늦게 수집한 것**을 쓴다(잠정값이 다음 수집에서 늘어남).
// 읽기만 한다 — 게시 경로·검증기와 무관. 얕은 clone 이면 먼저 `git fetch --deepen=1000 origin main`.
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 << 20 });
if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
  console.error('주의: 얕은 clone — 옛 지표 판이 빠질 수 있음. git fetch --deepen=1000 origin main 뒤 다시 실행');
}
const from = process.argv[2] || '2026-11-05';
const to = process.argv[3] || '2026-11-18';
const BEFORE = ['2026-10-25', '2026-11-03']; // E6 시작 전 비교 기간(experiments.md 의 0.32%)

const days = new Map(); // day → { cap, reach, pv, taps, bio }
let commit = null;
for (const line of git('log', 'HEAD', '--format=@%H %cI', '--name-only', '--', 'data/insights/').split('\n')) {
  if (line.startsWith('@')) { const [h, t] = line.slice(1).split(' '); commit = { h, t: Date.parse(t) }; continue; }
  if (!line.endsWith('.json') || !commit) continue;
  let d;
  try { d = JSON.parse(git('show', `${commit.h}:${line}`)); } catch { continue; }
  const y = d.account?.yesterday;
  if (!y?.day) continue;
  const cap = Date.parse(d.capturedAt || '') || commit.t;
  const old = days.get(y.day);
  if (old && old.cap >= cap) continue;
  days.set(y.day, { cap, reach: y.reach ?? 0, pv: y.profile_views ?? 0, taps: (y.profile_links_taps ?? 0) + (y.website_clicks ?? 0), bio: d.account?.biography ?? null });
}

const kst = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(5, 16).replace('T', ' ').replace('-', '/');
const sum = (a, b) => {
  const r = [...days.entries()].filter(([k]) => k >= a && k <= b).sort(([x], [y]) => x.localeCompare(y));
  const t = r.reduce((s, [, v]) => ({ reach: s.reach + v.reach, pv: s.pv + v.pv, taps: s.taps + v.taps }), { reach: 0, pv: 0, taps: 0 });
  return { rows: r, n: r.length, ...t, rate: t.reach ? (t.pv / t.reach) * 100 : null };
};
const pct = (v) => (v == null ? '-' : `${v.toFixed(2)}%`);

const cur = sum(from, to), pre = sum(...BEFORE);
console.log(`## 프로필 방문률 ${from} ~ ${to} (E6 판정: 0.6% 이상 채택 · 0.32% 근처 차이 없음)`);
console.log('| 날짜 | 도달 | 프로필 방문 | 링크 탭 | 수집(KST) | 소개 글 |');
console.log('|---|---|---|---|---|---|');
for (const [k, v] of cur.rows) console.log(`| ${k} | ${v.reach} | ${v.pv} | ${v.taps} | ${kst(v.cap)} | ${v.bio ?? '-'} |`);
console.log('');
console.log(`- 이 기간 ${cur.n}일: 도달 ${cur.reach} · 프로필 방문 ${cur.pv} (**${pct(cur.rate)}**) · 링크 탭 ${cur.taps}`);
console.log(`- 시작 전 ${BEFORE[0]} ~ ${BEFORE[1]} (${pre.n}일): 도달 ${pre.reach} · 프로필 방문 ${pre.pv} (${pct(pre.rate)}) · 링크 탭 ${pre.taps}`);
const bios = new Set(cur.rows.map(([, v]) => v.bio));
if (bios.size > 1) console.log(`- 주의: 기간 중 소개 글이 바뀜(${[...bios].join(' → ')}) — 바뀐 날 이후는 E6 효과와 섞인다`);
const last = cur.rows.at(-1);
if (last && last[1].cap - Date.parse(`${last[0]}T15:00:00Z`) < 12 * 3600e3) console.log(`- 주의: ${last[0]} 값은 하루 끝난 뒤 12시간 안에 수집한 잠정값 — 다음 수집에서 늘 수 있다`);
