// E5(compare·tips 21일 뒤 다시 올리기, 판단일 2026-11-19) 판정용 표 — 2026-11-10 in-1110-1
//   node src/repost-24h.mjs            다시 올린 compare·tips 의 올린 뒤 24시간 도달 vs 같은 분류 첫 게시
// 지표 파일(data/insights/<날짜>.json)은 같은 날 여러 번 덮어써지므로 git 기록의 모든 판을 읽는다.
// 옛 파일(10/18~24)엔 capturedAt 이 없어 그 커밋 시각을 수집 시각으로 쓴다(수집 직후 커밋).
// '24시간 도달' = 올린 뒤 18~32시간 수집 중 24시간에 가장 가까운 값. 없으면 '-'(아직 안 됐거나 수집 빠짐).
// 얕은 clone 이면 옛 판이 안 보인다 → 먼저 `git fetch --deepen=1000 origin main`.
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 << 20 });
const KINDS = new Set(['compare', 'tips']);

if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
  console.error('주의: 얕은 clone — 옛 지표 판이 빠질 수 있음. git fetch --deepen=1000 origin main 뒤 다시 실행');
}

const ref = process.argv[2] || 'HEAD';
const obs = new Map(); // mediaId → { at, post, kind, category, format, list: [{age, reach, skip}] }
let commit = null;
for (const line of git('log', ref, '--format=@%H %cI', '--name-only', '--', 'data/insights/').split('\n')) {
  if (line.startsWith('@')) { const [h, t] = line.slice(1).split(' '); commit = { h, t: Date.parse(t) }; continue; }
  if (!line.endsWith('.json') || !commit) continue;
  let d;
  try { d = JSON.parse(git('show', `${commit.h}:${line}`)); } catch { continue; }
  const cap = Date.parse(d.capturedAt || '') || commit.t;
  for (const p of d.posts || []) {
    if (!KINDS.has(p.kind)) continue;
    const at = Date.parse(p.at.replace(/\+0000$/, 'Z'));
    const o = obs.get(p.id) || { at, post: p.post, kind: p.kind, category: p.category, format: p.format || (p.type === 'REELS' ? 'reel' : 'carousel'), list: [] };
    o.list.push({ age: (cap - at) / 3600e3, reach: p.reach ?? null, skip: typeof p.reels_skip_rate === 'number' && p.reach > 0 ? p.reels_skip_rate : null });
    obs.set(p.id, o);
  }
}

const at24 = (o) => {
  const near = o.list.filter((x) => x.age >= 18 && x.age <= 32).sort((a, b) => Math.abs(a.age - 24) - Math.abs(b.age - 24));
  return near[0] || null;
};
const latest = (o) => o.list.reduce((a, b) => (b.age > a.age ? b : a));
const kst = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(5, 16).replace('T', ' ').replace('-', '/');
const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

// 분류별 첫 게시(가장 이른 것)와 다시 올린 것
const posts = [...obs.values()].sort((a, b) => a.at - b.at);
const firsts = new Map(), reposts = [];
for (const o of posts) {
  const key = `${o.kind}:${o.category}`;
  if (!firsts.has(key)) firsts.set(key, o); else reposts.push(o);
}
// 첫 게시가 캐러셀(10/19~20 driver·iron)이면 도달 0~1 이라 비율이 무의미 → 같은 종류 릴스 첫 게시 평균을 대신 기준으로 씀
const kindBase = {};
for (const k of KINDS) {
  const r = [...firsts.values()].filter((o) => o.kind === k && o.format === 'reel').map(at24).filter(Boolean);
  kindBase[k] = { n: r.length, reach: avg(r.map((x) => x.reach)), skip: avg(r.map((x) => x.skip).filter((v) => v != null)) };
}

const pct = (a, b) => (a == null || !b ? '-' : `${Math.round((a / b) * 100)}%`);
const f1 = (v) => (v == null ? '-' : `${v.toFixed(1)}%`);
const rows = reposts.map((o) => {
  const first = firsts.get(`${o.kind}:${o.category}`);
  const f = at24(first), r = at24(o), now = latest(o);
  const carousel = first.format !== 'reel';
  const base = carousel ? kindBase[o.kind].reach : f?.reach;
  return {
    line: `| ${o.kind} | ${o.category} | ${kst(first.at)} ${carousel ? '캐러셀' : '릴스'} · ${f ? f.reach : '-'}${f?.skip != null ? ` (${f1(f.skip)})` : ''} | ${kst(o.at)} · ${r ? `${r.reach} (${f1(r.skip)})` : `아직 — 지금 ${now.reach} (${Math.round(now.age)}시간)`} | ${carousel ? `종류 평균 ${Math.round(base)}` : base ?? '-'} | ${r ? pct(r.reach, base) : '-'} |`,
    ratio: r && base ? r.reach / base : null,
  };
});

const done = rows.filter((x) => x.ratio != null);
const mean = avg(done.map((x) => x.ratio));
console.log(`## E5 다시 올린 compare·tips — 올린 뒤 24시간 도달 (판단일 2026-11-19: 평균 70% 이상 유지 · 50% 미만 되돌림)
| 종류 | 분류 | 첫 게시 (KST · 24시간 도달 (첫 3초 건너뛰기)) | 다시 올림 (KST · 24시간 도달 (건너뛰기)) | 기준 | 비율 |
|---|---|---|---|---|---|
${rows.map((x) => x.line).join('\n') || '| - | - | - | - | - | - |'}

- 24시간 값이 나온 편: ${done.length} / ${rows.length}${mean != null ? ` · 비율 평균 ${Math.round(mean * 100)}%` : ''}
- 종류별 릴스 첫 게시 24시간 평균(캐러셀 첫 게시의 대신 기준): ${[...KINDS].map((k) => `${k} ${kindBase[k].n}편 도달 ${Math.round(kindBase[k].reach)} · 건너뛰기 ${f1(kindBase[k].skip)}`).join(' / ')}
- 주의: 10/27~30 첫 게시 일부(compare 골프백 15·장갑 55·GPS 27·런치 29, tips GPS 32·연습 63)는 계정 노출이 떨어진 시기라 기준이 낮다 — 그 분류는 비율이 높게 나온다.`);
