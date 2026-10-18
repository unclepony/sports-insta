// 매일 원본 수집: data/raw/<날짜>/{bills,plenary,members}.json
// 사용: node src/fetch.mjs   (ASSEMBLY_API_KEY 없으면 샘플 5건씩)
import { mkdir, writeFile } from 'node:fs/promises';
import { AGE, DATASETS, SAMPLE_MODE, fetchAll, pick } from './assembly.mjs';
import { today } from './util.mjs';

const date = today();
const dir = new URL(`../data/raw/${date}/`, import.meta.url);
await mkdir(dir, { recursive: true });

const jobs = [
  ['bills', DATASETS.bills, { AGE }, 2000, pick.bill],
  ['plenary', DATASETS.plenary, { AGE }, 1000, pick.plenary],
  ['members', DATASETS.members, {}, 400, pick.member],
];

for (const [name, code, params, max, fn] of jobs) {
  const { total, rows } = await fetchAll(code, params, max);
  const out = { fetchedAt: new Date().toISOString(), sample: SAMPLE_MODE, total, rows: rows.map(fn) };
  await writeFile(new URL(`${name}.json`, dir), JSON.stringify(out, null, 1));
  console.log(`${name}: ${rows.length}/${total}${SAMPLE_MODE ? ' (샘플 모드)' : ''}`);
}
