// in-1115-1 (2026-11-15): pick 도달이 '분류' 때문에 낮은지 보는 표. E7(pick 21일 재사용) 때 어느 분류를 다시 올릴지 근거.
//   node src/reach-by-category.mjs [시작 YYYY-MM-DD]   기본 2026-10-25
// 게시물마다 '올린 지 40~60시간' 수집의 도달(첫 노출 몫)을 쓴다. 그 수집이 없으면 48시간 넘은 마지막 값, 48시간 전이면 뺀다.
// data/insights/*.json(작업 폴더의 파일)만 읽는다 — 게시 경로·검증기와 무관.
import { readdirSync, readFileSync } from 'node:fs';

const from = process.argv[2] || '2026-10-25';
const dir = 'data/insights';
const posts = new Map();
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  let d;
  try { d = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')); } catch { continue; }
  const cap = Date.parse(d.capturedAt || '');
  if (!cap) continue;
  for (const p of d.posts || []) {
    if (!p.post || !p.at || p.format !== 'reel') continue;
    const at = Date.parse(p.at.replace(/\+0000$/, 'Z'));
    const age = (cap - at) / 36e5;
    const o = posts.get(p.post) || { kind: p.kind, cat: p.category || '-', day: new Date(at + 9 * 3600e3).toISOString().slice(0, 10) };
    if (age >= 40 && age <= 60 && o.r48 == null) o.r48 = p.reach;
    if (age >= 48) o.late = p.reach;
    posts.set(p.post, o);
  }
}

const groups = new Map();
for (const [name, o] of posts) {
  if (o.day < from) continue;
  const r = o.r48 ?? o.late;
  if (r == null) continue;
  const key = o.kind === 'pick' ? `pick · ${o.cat}` : o.kind;
  const g = groups.get(key) || { n: 0, sum: 0, min: Infinity, last: '', names: [] };
  g.n++; g.sum += r; g.min = Math.min(g.min, r);
  if (o.day > g.last) g.last = o.day;
  g.names.push(`${name.replace(/^pick-/, '')} ${r}`);
  groups.set(key, g);
}

const rows = [...groups].sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n);
console.log(`## 릴스 48시간 도달 — 종류(pick 은 분류별) ${from} 부터`);
console.log('| 묶음 | 편 | 평균 | 최소 | 마지막 게시 | 게시물(도달) |');
console.log('|---|---|---|---|---|---|');
for (const [k, g] of rows) console.log(`| ${k} | ${g.n} | ${Math.round(g.sum / g.n)} | ${g.min} | ${g.last} | ${g.names.join(' · ')} |`);
console.log('\n- 48시간이 안 된 게시물은 빠진다. 편 수가 1~3이면 참고용.');
