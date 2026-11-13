// E6 판정 보조(in-1114-1, 2026-11-14): 프로필 방문이 '띠 문구 있는 pick' 이 많이 노출된 날에 더 나왔는지 보는 표.
//   node src/profile-by-kind.mjs [시작 YYYY-MM-DD] [끝 YYYY-MM-DD]   기본 2026-10-25 ~ 어제
// 왜 날짜 단위인가: 인스타 API 는 릴스 게시물별 profile_visits 를 주지 않는다(data/insights 730건 중 값이 있는 19건은
// 모두 10/24~27 캐러셀, 릴스는 전부 null) → 게시물별 표는 만들 수 없다. 대신 날마다 계정 프로필 방문(account.yesterday,
// profile-rate.mjs 와 같은 '가장 늦은 수집' 값)을 그날 노출된 게시물 종류와 맞댄다.
// 노출 배분(가정): 게시물의 최종 도달을 올린 날(KST)과 다음 날에 반씩 나눈다(첫 노출 몫이 대부분 48시간 안에 들어온다는 관찰).
// 읽기만 한다 — 게시 경로·검증기와 무관. 얕은 clone 이면 먼저 `git fetch --deepen=1000 origin main`.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 << 20 });
if (git('rev-parse', '--is-shallow-repository').trim() === 'true') console.error('주의: 얕은 clone — git fetch --deepen=1000 origin main 뒤 다시 실행');
const kstDay = (iso) => new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(0, 10);
const addDay = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);
const from = process.argv[2] || '2026-10-25';
const to = process.argv[3] || addDay(kstDay(new Date().toISOString()), -1);
const E6 = '2026-11-05'; // pick 띠·끝 장 문구 시작일(첫 적용 게시물 기준)

// 1) 날마다 계정 값(가장 늦은 수집) — profile-rate.mjs 와 같은 방식
const days = new Map();
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
  days.set(y.day, { cap, reach: y.reach ?? 0, pv: y.profile_views ?? 0, taps: (y.profile_links_taps ?? 0) + (y.website_clicks ?? 0) });
}

// 2) 게시물별 최종 도달(작업 공간의 모든 지표 파일 중 최댓값) → 올린 날·다음 날에 반씩
const posts = new Map();
for (const f of readdirSync(new URL('../data/insights/', import.meta.url))) {
  const j = JSON.parse(readFileSync(new URL(`../data/insights/${f}`, import.meta.url), 'utf8'));
  for (const p of j.posts || []) {
    if (!p.at) continue;
    const old = posts.get(p.id);
    if (!old || (p.reach ?? 0) > old.reach) posts.set(p.id, { day: kstDay(p.at), kind: p.kind || 'other', reach: p.reach ?? 0 });
  }
}
const share = new Map(); // day → { kind: reach }
for (const p of posts.values()) {
  for (const d of [p.day, addDay(p.day, 1)]) {
    const m = share.get(d) || {};
    m[p.kind] = (m[p.kind] || 0) + p.reach / 2;
    share.set(d, m);
  }
}

const rows = [...days.entries()].filter(([k]) => k >= from && k <= to).sort(([a], [b]) => a.localeCompare(b));
console.log(`## 날짜별 프로필 방문 × 노출 종류 ${from} ~ ${to}`);
console.log('| 날짜 | 계정 도달 | 프로필 방문 | 링크 탭 | 노출 배분(가정) | pick 비중 | E6 |');
console.log('|---|---|---|---|---|---|---|');
const groups = {};
for (const [k, v] of rows) {
  const m = share.get(k) || {};
  const tot = Object.values(m).reduce((s, x) => s + x, 0);
  const pk = tot ? (m.pick || 0) / tot : null;
  const mix = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([x, r]) => `${x} ${Math.round(r)}`).join(' · ') || '-';
  const e6 = k >= E6 ? '후' : '전';
  console.log(`| ${k} | ${v.reach} | ${v.pv} | ${v.taps} | ${mix} | ${pk == null ? '-' : `${Math.round(pk * 100)}%`} | ${e6} |`);
  const g = `${e6} · pick ${pk == null ? '?' : pk >= 0.5 ? '절반 이상' : '절반 미만'}`;
  const s = (groups[g] ||= { n: 0, reach: 0, pv: 0, taps: 0 });
  s.n++; s.reach += v.reach; s.pv += v.pv; s.taps += v.taps;
}
console.log('');
for (const [g, s] of Object.entries(groups).sort()) {
  console.log(`- ${g}: ${s.n}일 · 도달 ${s.reach} · 프로필 방문 ${s.pv} (${s.reach ? ((s.pv / s.reach) * 100).toFixed(2) : '-'}%) · 링크 탭 ${s.taps}`);
}
console.log('- 주의: 프로필 방문이 하루 0~4건이라 묶음별 차이는 1~2건으로 뒤집힌다. 판정 근거가 아니라 참고용.');
