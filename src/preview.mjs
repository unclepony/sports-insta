// 미리보기: 최신 원본으로 만들 수 있는 게시물을 모두 만들고 검증·렌더링한다(게시하지 않음).
// 결과: out/preview/<게시물 id>/NN.jpg, caption.txt, (--reel 이면) reel.mp4, 그리고 out/preview/index.html
// 사용: node src/preview.mjs [--reel] [--limit=N]
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { ROOT, esc, today } from './util.mjs';
import { candidates, choose, isReelDay, loadRaw } from './plan.mjs';
import { validatePost } from './validate.mjs';
import { openBrowser, renderCards, renderReel, renderReelFrames } from './render.mjs';

const args = process.argv.slice(2);
const withReel = args.includes('--reel');
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || 99);

const rawRoot = new URL('data/raw/', ROOT);
const day = (await readdir(rawRoot)).sort().at(-1);
const rawDir = new URL(`${day}/`, rawRoot);
const raw = loadRaw(rawDir);
const date = today();

const list = candidates(raw, date).slice(0, limit);
const pick = choose(list, { posted: {} }, date);
const outRoot = new URL('out/preview/', ROOT);
await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });

const browser = await openBrowser();
const results = [];
const reelKinds = new Set(); // 릴스는 종류마다 첫 게시물만(시간 절약)
for (const post of list) {
  const errors = validatePost(post, rawDir);
  const r = { post, errors, files: [], reel: null };
  results.push(r);
  if (errors.length) { console.error(`✗ ${post.id} 검증 실패\n  ${errors.join('\n  ')}`); continue; }
  const dir = new URL(`${post.id}/`, outRoot);
  try {
    r.files = (await renderCards(browser, post, dir)).map((f) => `${post.id}/${f}`);
  } catch (e) {
    r.errors.push(e.message);
    console.error(`✗ ${post.id} ${e.message}`);
    continue;
  }
  if (withReel && !reelKinds.has(post.kind) && reelKinds.add(post.kind)) r.reel = `${post.id}/${await renderReel(dir, await renderReelFrames(browser, post, dir, r.files.map((f) => f.split('/')[1])))}`;
  console.log(`✓ ${post.id}: ${r.files.length}장${r.reel ? ' + 릴스' : ''}${post.warnings.length ? ` (주의: ${post.warnings.join('; ')})` : ''}`);
}
await browser.close();

const gallery = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>인스타 미리보기 ${esc(date)}</title>
<style>body{font-family:sans-serif;background:#ddd;margin:24px}h2{margin:36px 0 6px}.row{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}
img{width:288px;height:360px;flex:none;box-shadow:0 1px 4px #0003}video{height:512px;flex:none}pre{background:#fff;padding:12px;white-space:pre-wrap;max-width:760px}.err{color:#b00}.today{background:#1f7a4d;color:#fff;padding:2px 8px;font-size:14px;margin-left:8px}</style></head><body>
<h1>인스타 미리보기 · ${esc(date)} (원본 ${esc(day)})</h1>
<p>오늘 계획: <b>${esc(pick?.id || '없음')}</b> — ${isReelDay(date) ? '릴스 요일' : '캐러셀 요일'}</p>
${results.map(({ post, errors, files, reel }) => `<h2>${esc(post.series)} <small>${esc(post.id)}</small>${post === pick ? '<span class="today">오늘 게시 후보</span>' : ''}</h2>
${post.warnings.length ? `<p class="err">${esc(post.warnings.join(' / '))}</p>` : ''}
${errors.length ? `<pre class="err">검증 실패 — 게시하지 않음\n${esc(errors.join('\n'))}</pre>` : `<div class="row">${reel ? `<video src="${reel}" controls muted></video>` : ''}${files.map((f) => `<img src="${f}">`).join('')}</div><pre>${esc(post.caption)}</pre>`}`).join('')}
</body></html>`;
await writeFile(new URL('index.html', outRoot), gallery);
if (results.some((r) => r.errors.length)) process.exitCode = 1;
