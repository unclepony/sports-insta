// 최신 원본으로 게시물을 만들고 검증한 뒤 JPEG 로 렌더링한다(게시는 하지 않음).
// 결과: out/preview/<게시물>/NN.jpg, caption.txt, 그리고 out/preview/index.html (한눈에 보기)
// 사용: node src/preview.mjs [data/raw/날짜]
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { W, H } from './cards/templates.mjs';
import { billsPost, plenaryPost } from './posts.mjs';
import { validatePost } from './validate.mjs';
import { esc } from './util.mjs';

const root = new URL('../', import.meta.url);
const rawRoot = new URL('data/raw/', root);
const day = process.argv[2]?.split(/[\\/]/).filter(Boolean).at(-1) || (await readdir(rawRoot)).sort().at(-1);
const rawDir = new URL(`${day}/`, rawRoot);
const raw = {};
for (const name of ['bills', 'plenary', 'members']) raw[name] = JSON.parse(await readFile(new URL(`${name}.json`, rawDir), 'utf8'));

const outRoot = new URL('out/preview/', root);
await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });

// 로컬은 설치된 Chrome/Edge, GitHub Actions 는 러너에 깔린 Chrome 을 쓴다.
async function launch() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel }); } catch {}
  }
  throw new Error('Chrome 또는 Edge 를 찾을 수 없습니다');
}
const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });

const results = [];
for (const post of [billsPost(raw), plenaryPost(raw)].filter(Boolean)) {
  const errors = validatePost(post, raw);
  if (errors.length) {
    console.error(`✗ ${post.id} 검증 실패 — 만들지 않음\n  ${errors.join('\n  ')}`);
    results.push({ post, errors, files: [] });
    continue;
  }
  const dir = new URL(`${post.id}/`, outRoot);
  await mkdir(dir, { recursive: true });
  const files = [];
  for (const [i, card] of post.cards.entries()) {
    await page.setContent(card.html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const file = `${String(i + 1).padStart(2, '0')}-${card.name}.jpg`;
    await page.screenshot({ path: fileURLToPath(new URL(file, dir)), type: 'jpeg', quality: 92 });
    files.push(`${post.id}/${file}`);
  }
  await writeFile(new URL('caption.txt', dir), post.caption);
  console.log(`✓ ${post.id}: ${files.length}장, 검증 통과`);
  results.push({ post, errors, files });
}
await browser.close();

const gallery = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>카드 미리보기 ${esc(day)}</title>
<style>body{font-family:sans-serif;background:#ddd;margin:24px}h2{margin:32px 0 8px}.row{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}
img{width:320px;height:400px;flex:none;box-shadow:0 1px 4px #0003}pre{background:#fff;padding:12px;white-space:pre-wrap;max-width:720px}.err{color:#b00}</style></head><body>
<h1>카드 미리보기 · 원본 ${esc(day)}</h1>
${results.map(({ post, errors, files }) => `<h2>${esc(post.series)} (${esc(post.date)})</h2>
${errors.length ? `<pre class="err">검증 실패 — 게시하지 않음\n${esc(errors.join('\n'))}</pre>` : `<div class="row">${files.map((f) => `<img src="${f}">`).join('')}</div><pre>${esc(post.caption)}</pre>`}`).join('')}
</body></html>`;
await writeFile(new URL('index.html', outRoot), gallery);
if (results.some((r) => r.errors.length)) process.exitCode = 1;
