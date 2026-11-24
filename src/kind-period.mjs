// 릴스 종류별 기간 평균(도달·첫 3초 건너뛰기·평균 시청) — 표지·문구 실험을 '다른 종류'와 맞대 보려고 (2026-11-25 in-1125-1, E4 판정)
//   node src/kind-period.mjs <시작 YYYY-MM-DD> <끝 YYYY-MM-DD> [<시작2> <끝2> ...]   (끝은 그날 제외, 게시 시각 UTC 기준)
// 값: 작업 폴더의 data/insights/*.json 에서 게시물마다 '올린 뒤 48시간 지난 마지막 값'(48시간 전 값만 있으면 그 마지막 값).
// 한 종류만 바뀐 실험이면 같은 기간 다른 종류의 변화가 계정 전체 변화(대조군)다. 읽기만 한다 — 게시 경로·검증기와 무관.
import fs from 'node:fs';

const args = process.argv.slice(2);
if (args.length < 2 || args.length % 2) { console.log('사용: node src/kind-period.mjs 2026-10-21 2026-10-31 2026-11-09 2026-11-21'); process.exit(1); }

const dir = new URL('../data/insights/', import.meta.url);
const last = new Map();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const j = JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8'));
  for (const p of j.posts || []) {
    if (p.format !== 'reel' || p.reels_skip_rate == null) continue;
    const old = (Date.parse(j.capturedAt) - Date.parse(p.at)) / 36e5 >= 48;
    const prev = last.get(p.post);
    if (prev?.old && !old) continue;
    last.set(p.post, { ...p, old });
  }
}

const avg = (l, f) => l.reduce((s, x) => s + (Number(x[f]) || 0), 0) / l.length;
console.log('| 기간 | 종류 | 편 | 도달 평균 | 첫 3초 건너뛰기 | 평균 시청 |');
console.log('|---|---|---|---|---|---|');
for (let i = 0; i < args.length; i += 2) {
  const [a, b] = [args[i], args[i + 1]];
  const by = {};
  for (const p of last.values()) if (p.at >= a && p.at < b) (by[p.kind] ??= []).push(p);
  for (const [k, l] of Object.entries(by).sort()) {
    console.log(`| ${a}~${b} | ${k} | ${l.length} | ${avg(l, 'reach').toFixed(1)} | ${avg(l, 'reels_skip_rate').toFixed(1)}% | ${(avg(l, 'ig_reels_avg_watch_time') / 1000).toFixed(1)}초 |`);
  }
}
