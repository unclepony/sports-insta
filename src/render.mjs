// 카드 HTML → JPEG(1080×1350), 카드 묶음 → 릴스 MP4(1080×1920, H.264)
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { chromium } from 'playwright-core';
import { W, H } from './cards/base.mjs';

// 로컬은 설치된 Chrome/Edge, GitHub Actions 는 러너에 깔린 Chrome
export async function openBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel }); } catch {}
  }
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
      const foot = document.querySelector('.foot').getBoundingClientRect().top;
      const bad = [...document.querySelectorAll('.card > *:not(.foot)')].flatMap((el) => [el, ...el.querySelectorAll('*')])
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

function run(args) {
  return new Promise((ok, fail) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg ${code}\n${err.slice(-1500)}`))));
  });
}

// 카드 이미지를 세로 화면 가운데에 놓고 장마다 천천히 확대 + 장 사이 밀어내기 전환.
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
    return `[${i}:v]scale=1080:1350,zoompan=z='1+0.04*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1350:fps=${fps},`
      + `pad=1080:1920:0:285:color=0xf6f7f4,setsar=1,format=yuv420p[v${i}]`;
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
