// 프로필 방문을 '수집 간격' 단위로 게시물에 붙여 보는 표 — 2026-11-23 in-1123-1
//   node src/profile-by-post.mjs [시작 YYYY-MM-DD] [끝 YYYY-MM-DD]   기본: 최근 7일(인스타 집계일)
// 왜: 인스타 API 는 릴스별 profile_visits 를 주지 않는다(전부 null). profile-by-kind.mjs 는 날짜 단위 + '반씩 배분' 가정이라 거칠다.
// 관찰(11/15~22 수집 판): 릴스 한 편의 도달은 올린 뒤 첫 수집 간격(2~9시간)에 100~130 이 한 번에 들어오고 그 뒤 거의 늘지 않는다.
// → 수집과 수집 사이에 account.yesterday.profile_views 가 늘었으면, 그 간격에 도달이 가장 많이 늘어난 게시물을 '보낸 후보'로 본다.
// 한계: 같은 간격에 두 편이 같이 늘면 가르지 못함(둘 다 적음). 인스타 하루가 바뀌는 간격(전날 마지막 판 → 새 날 첫 판)은
//   새 날 첫 값 전부를 그 간격에 붙인다(그 앞 간격 몫이 섞일 수 있음). 집계 지연으로 몇 시간 늦게 잡힐 수도 있다. 추정이지 측정이 아니다.
// 읽기만 한다 — 게시 경로·검증기와 무관. 얕은 clone 이면 먼저 `git fetch --deepen=1000 origin main`.
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 << 20 });
if (git('rev-parse', '--is-shallow-repository').trim() === 'true') console.log('⚠ 얕은 clone — 오래된 수집 판이 빠져 값이 작게 나올 수 있다. git fetch --deepen=1000 origin main 뒤 다시 실행'); // 2026-11-24: stderr 라 tail 에 안 보여 표에 섞어 찍음
const addDay = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

// 1) 모든 지표 판(capturedAt 있는 것)
const snaps = new Map();
let commit = null;
for (const line of git('log', 'HEAD', '--since=2026-11-01', '--format=@%H', '--name-only', '--', 'data/insights/').split('\n')) {
  if (line.startsWith('@')) { commit = line.slice(1); continue; }
  if (!line.endsWith('.json') || !commit) continue;
  let d; try { d = JSON.parse(git('show', `${commit}:${line}`)); } catch { continue; }
  if (d.capturedAt && !snaps.has(d.capturedAt)) snaps.set(d.capturedAt, d);
}
const caps = [...snaps.keys()].sort();
const lastDay = caps.length ? snaps.get(caps.at(-1)).account?.yesterday?.day : null;
const to = process.argv[3] || (lastDay ? addDay(lastDay, -1) : null); // 마지막 집계일은 잠정이라 기본에서 뺀다
const from = process.argv[2] || (to ? addDay(to, -6) : null);
if (!to) { console.log('지표 판 없음'); process.exit(0); }

// 2) 간격마다: 프로필 방문 증가, 도달 증가 게시물
const rows = [];
const byPost = new Map(); // post → { kind, gain, pv }
let prev = null;
for (const cap of caps) {
  const d = snaps.get(cap);
  const y = d.account?.yesterday || {};
  const reach = new Map((d.posts || []).map((p) => [p.post, { r: p.reach || 0, kind: p.kind }]));
  if (prev && y.day) {
    const sameDay = prev.y.day === y.day;
    const dpv = (y.profile_views ?? 0) - (sameDay ? (prev.y.profile_views ?? 0) : 0);
    const gains = [...reach].map(([k, v]) => [k, v.kind, v.r - (prev.reach.get(k)?.r ?? 0)]).filter((g) => g[2] >= 20).sort((a, b) => b[2] - a[2]);
    if (y.day >= from && y.day <= to) {
      rows.push({ cap, day: y.day, dpv, cross: !sameDay, gains });
      const top = gains[0];
      for (const g of gains) {
        const o = byPost.get(g[0]) || { kind: g[1], gain: 0, pv: 0, shared: false };
        o.gain += g[2];
        if (dpv > 0 && g === top) { o.pv += dpv; if (gains.length > 1 && gains[1][2] >= top[2] / 2) o.shared = true; }
        byPost.set(g[0], o);
      }
    }
  }
  prev = { y, reach };
}

const kst = (iso) => new Date(Date.parse(iso) + 9 * 3600e3).toISOString().slice(5, 16).replace('T', ' ');
console.log(`## 프로필 방문 × 수집 간격 (인스타 집계일 ${from} ~ ${to})`);
console.log('| 수집(KST) | 집계일 | 프로필 방문 + | 이 간격에 도달이 늘어난 게시물(20 이상) |');
console.log('|---|---|---|---|');
for (const r of rows) if (r.dpv > 0 || r.gains.length) console.log(`| ${kst(r.cap)}${r.cross ? ' (날 바뀜)' : ''} | ${r.day} | ${r.dpv > 0 ? r.dpv : 0} | ${r.gains.map((g) => `${g[0]} +${g[2]}`).join(' · ') || '-'} |`);
console.log('\n## 게시물별 (간격에서 도달이 가장 많이 늘어난 편에 그 간격의 프로필 방문을 붙임)');
console.log('| 게시물 | 종류 | 도달 + | 프로필 방문(추정) |');
console.log('|---|---|---|---|');
const list = [...byPost].sort((a, b) => b[1].pv - a[1].pv || b[1].gain - a[1].gain);
for (const [k, o] of list) console.log(`| ${k} | ${o.kind} | ${o.gain} | ${o.pv}${o.shared ? ' (다른 편과 겹침)' : ''} |`);
const kinds = new Map();
for (const [, o] of list) { const s = kinds.get(o.kind) || { n: 0, gain: 0, pv: 0 }; s.n++; s.gain += o.gain; s.pv += o.pv; kinds.set(o.kind, s); }
const total = rows.reduce((s, r) => s + Math.max(r.dpv, 0), 0);
console.log(`\n- 종류별: ${[...kinds].map(([k, s]) => `${k} ${s.n}편 · 도달 ${s.gain} · 프로필 ${s.pv} (도달 100당 ${s.gain ? (s.pv * 100 / s.gain).toFixed(2) : '-'})`).join(' / ')}`);
console.log(`- 기간 프로필 방문 합 ${total}(간격 합). 날 바뀜 간격의 값은 앞 간격 몫이 섞일 수 있다. 하루 0~5건이라 1~2건으로 순위가 뒤집힌다 — 참고용.`);
