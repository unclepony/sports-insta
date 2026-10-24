// 카드 HTML → JPEG(1080×1350), 카드 묶음 → 릴스 MP4(1080×1920, H.264)
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { chromium } from 'playwright-core';
import { W, H, CSS } from './cards/base.mjs';
import { brand, esc } from './util.mjs';

// 로컬은 설치된 Chrome/Edge, GitHub Actions 는 러너에 깔린 Chrome
export async function openBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel }); } catch {}
  }
  // 클라우드 루틴 환경: 설치된 Chromium 경로(CHROME_PATH)로 미리보기
  if (process.env.CHROME_PATH) return chromium.launch({ executablePath: process.env.CHROME_PATH });
  throw new Error('Chrome 또는 Edge 를 찾을 수 없습니다');
}

export async function renderCards(browser, post, dirUrl) {
  await mkdir(dirUrl, { recursive: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const files = [];
  for (const [i, card] of post.cards.entries()) {
    await page.setContent(card.html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // 글자가 넘쳐 아래 출처 줄과 겹치거나 카드 밖으로 나가면 실패(그 게시물은 올리지 않음)
    const overflow = await page.evaluate(() => {
      const foot = document.querySelector('.foot, .ft').getBoundingClientRect().top;
      const bad = [...document.querySelectorAll('.card > *:not(.foot):not(.ft)')].flatMap((el) => [el, ...el.querySelectorAll('*')])
        .filter((el) => { const b = el.getBoundingClientRect(); return b.height > 0 && (b.bottom > foot + 1 || b.right > innerWidth - 40); });
      return bad.length ? bad[0].textContent.trim().slice(0, 40) : '';
    });
    if (overflow) throw new Error(`${post.id}/${card.name}: 내용이 넘침 — "${overflow}"`);
    const name = `${String(i + 1).padStart(2, '0')}-${card.name}.jpg`;
    await page.screenshot({ path: fileURLToPath(new URL(name, dirUrl)), type: 'jpeg', quality: 92 });
    files.push(name);
  }
  await page.close();
  await writeFile(new URL('caption.txt', dirUrl), post.caption);
  return files;
}

// 릴스용 세로 프레임(1080×1920): 위에 시리즈 제목, 가운데 카드, 아래에 프로필 링크 안내
export async function renderReelFrames(browser, post, dirUrl, files) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const out = [];
  for (const f of files) {
    const img = (await import('node:fs')).readFileSync(new URL(f, dirUrl)).toString('base64');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${CSS}
html,body{width:1080px;height:1920px}
${(brand.theme || 'v2') === 'v2' ? ':root{--bg:#0b2f20;--ink:#fff;--accent:#e9c46a}html,body{background:#0b2f20;color:#fff}' : ''}.reel{height:1920px;display:flex;flex-direction:column;align-items:center}
.reel .t{height:285px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px}
.reel .t b{font-size:58px;font-weight:900;letter-spacing:-1.5px}.reel .t span{font-size:30px;color:var(--accent);font-weight:700}
.reel img{width:1080px;height:1350px;display:block}
.reel .b{height:285px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:6px;font-size:34px;font-weight:700}
.reel .b span{color:var(--accent);font-size:40px;font-weight:900}</style></head><body>
<div class="reel"><div class="t"><span>초이스골프</span><b>${esc(post.series)}</b></div>
<img src="data:image/jpeg;base64,${img}"><div class="b">자세한 비교·가격은 프로필 링크<span>${esc(brand.site)}</span></div></div></body></html>`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const name = f.replace(/.jpg$/, '-reel.jpg');
    await page.screenshot({ path: fileURLToPath(new URL(name, dirUrl)), type: 'jpeg', quality: 92 });
    out.push(name);
  }
  await page.close();
  return out;
}

function run(args) {
  return new Promise((ok, fail) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg ${code}\n${err.slice(-1500)}`))));
  });
}

// 세로 프레임(renderReelFrames)을 장마다 천천히 확대 + 장 사이 밀어내기 전환.
// 소리는 무음 트랙(남의 음원을 쓰지 않음).
export async function renderReel(dirUrl, files, out = 'reel.mp4', { first = 3.5, each = 3.2, fade = 0.45 } = {}) {
  const dir = fileURLToPath(dirUrl);
  const fps = 30;
  const durs = files.map((_, i) => (i === 0 ? first : each));
  const args = ['-y'];
  files.forEach((f, i) => args.push('-loop', '1', '-t', String(durs[i]), '-i', `${dir}/${f}`));
  args.push('-f', 'lavfi', '-t', String(durs.reduce((a, b) => a + b, 0)), '-i', 'anullsrc=r=44100:cl=stereo');
  const parts = files.map((_, i) => {
    const frames = Math.round(durs[i] * fps);
    return `[${i}:v]scale=1080:1920,zoompan=z='1+0.03*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps},setsar=1,format=yuv420p[v${i}]`;
  });
  let last = 'v0', offset = 0;
  for (let i = 1; i < files.length; i++) {
    offset += durs[i - 1] - fade;
    parts.push(`[${last}][v${i}]xfade=transition=slideleft:duration=${fade}:offset=${offset.toFixed(2)}[x${i}]`);
    last = `x${i}`;
  }
  args.push('-filter_complex', parts.join(';'), '-map', `[${last}]`, '-map', `${files.length}:a`,
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(fps), '-b:v', '6M',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', `${dir}/${out}`);
  await run(args);
  return out;
}
