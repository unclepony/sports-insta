// v1(지금 게시 중) ↔ v2(벤치마킹 테스트) 나란히 비교. 게시하지 않는다.
// 결과: out/preview-v2/index.html
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { ROOT, esc, today } from './util.mjs';
import { loadRaw } from './plan.mjs';
import { tourPost } from './posts/tour.mjs';
import { comparePost } from './posts/gear.mjs';
import { tourPostV2, comparePostV2 } from './posts/v2.mjs';
import { validatePost } from './validate.mjs';
import { openBrowser, renderCards, renderReel, renderReelFrames } from './render.mjs';

const rawRoot = new URL('data/raw/', ROOT);
const day = (await readdir(rawRoot)).sort().at(-1);
const rawDir = new URL(`${day}/`, rawRoot);
const raw = loadRaw(rawDir);
const date = today();
const src = Object.keys(raw).find((k) => k.startsWith('tour-') && raw[k].state === 'post' && raw[k].league === 'lpga') || Object.keys(raw).find((k) => k.startsWith('tour-'));

const pairs = [
  ['투어 결과', tourPost(raw[src], src), tourPostV2(raw[src], src)],
  ['드라이버 가격 비교', comparePost(raw.gear, 'driver', date), comparePostV2(raw.gear, 'driver', date)],
];
const out = new URL('out/preview-v2/', ROOT);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const browser = await openBrowser();
const rows = [];
for (const [title, ...posts] of pairs) {
  const r = { title, sides: [] };
  for (const post of posts) {
    if (!post) { r.sides.push({ errors: ['만들 수 없음'] }); continue; }
    const errors = validatePost(post, rawDir);
    let files = [], reel = null;
    if (!errors.length) {
      try {
        files = await renderCards(browser, post, new URL(`${post.id}/`, out));
        if (post.id.startsWith('v2-')) reel = await renderReel(new URL(`${post.id}/`, out), await renderReelFrames(browser, post, new URL(`${post.id}/`, out), files));
      } catch (e) { errors.push(e.message); }
    }
    console.log(`${errors.length ? '✗' : '✓'} ${post.id}${errors.length ? `\n  ${errors.join('\n  ')}` : ''}`);
    r.sides.push({ post, errors, files, reel });
  }
  rows.push(r);
}
await browser.close();
const side = (s, label) => `<div class="side"><h3>${label}</h3>${s.errors?.length ? `<pre class="err">${esc(s.errors.join('\n'))}</pre>` : `<div class="row">${s.reel ? `<video src="${s.post.id}/${s.reel}" controls muted></video>` : ''}${s.files.map((f) => `<img src="${s.post.id}/${f}">`).join('')}</div><pre>${esc(s.post.caption)}</pre>`}</div>`;
await writeFile(new URL('index.html', out), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>v1 vs v2</title><style>body{font-family:sans-serif;background:#ddd;margin:24px}.row{display:flex;gap:10px;overflow-x:auto}img{width:256px;height:320px;flex:none}video{height:455px;flex:none}pre{background:#fff;padding:10px;white-space:pre-wrap;max-width:720px}.err{color:#b00}</style></head><body>
<h1>v1(현재) vs v2(벤치마킹 테스트) · ${esc(date)}</h1>${rows.map((r) => `<h2>${esc(r.title)}</h2>${side(r.sides[0], 'v1 현재')}${side(r.sides[1], 'v2 테스트')}`).join('')}</body></html>`);
if (rows.some((r) => r.sides.some((s) => s.errors?.length))) process.exitCode = 1;
