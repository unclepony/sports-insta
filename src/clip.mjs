// ATL골프기어 유튜브 쇼츠를 인스타 릴스로 다시 올리기.
// 원본 파일은 사장님이 유튜브 스튜디오에서 받아 media/source/<유튜브 영상 ID>.mp4 로 넣는다
// (유튜브에서 자동으로 내려받지 않는다). 제목은 golf-price config/videos.json 의 것을 그대로 쓴다.
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT, brand, readJson } from './util.mjs';
import { DISCLOSURE } from './cards/gear.mjs';

const SRC = new URL('media/source/', ROOT);

function golfPriceVideos() {
  const dir = resolve(process.env.GOLF_PRICE_DIR || fileURLToPath(new URL('../golf-price', ROOT)));
  const f = resolve(dir, 'config', 'videos.json');
  if (!existsSync(f)) return [];
  const v = readJson(pathToFileURL(f));
  return Object.entries(v).flatMap(([guide, list]) => (Array.isArray(list) ? list.map((x) => ({ ...x, guide })) : []));
}

// 올릴 수 있는 쇼츠: 원본 파일이 있고, 쇼츠 형식이고, 아직 안 올린 것
export function clipCandidates(state) {
  if (!existsSync(SRC)) return [];
  const files = new Set(readdirSync(SRC).filter((f) => f.endsWith('.mp4')).map((f) => f.replace(/\.mp4$/, '')));
  return golfPriceVideos()
    .filter((v) => files.has(v.id) && (v.format === 'shorts' || /#shorts/i.test(v.title)))
    .filter((v) => !state.posted?.[`clip-${v.id}`])
    .map((v) => ({
      id: `clip-${v.id}`, kind: 'clip', series: 'ATL골프기어 영상', video: v,
      caption: [
        v.title.replace(/\s*#shorts/gi, '').trim(),
        '',
        `전체 영상은 유튜브 ATL골프기어 채널, 용품 비교·쿠팡 가격은 프로필 링크(${brand.site})에서 볼 수 있습니다.`,
        '',
        DISCLOSURE,
        '',
        '#골프 #골프용품 #골프초보 #ATL골프기어',
      ].join('\n'),
      warnings: [],
    }));
}

// 세로 1080×1920 으로 맞추고(남는 곳은 배경색) 90초로 자른다. 원본 소리는 그대로(직접 만든 영상).
export async function renderClip(clip, dirUrl) {
  await mkdir(dirUrl, { recursive: true });
  const input = fileURLToPath(new URL(`${clip.video.id}.mp4`, SRC));
  const out = fileURLToPath(new URL('reel.mp4', dirUrl));
  const cover = fileURLToPath(new URL('cover.jpg', dirUrl));
  const vf = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0xf6f7f4,setsar=1,format=yuv420p';
  await run(['-y', '-i', input, '-t', '90', '-vf', vf, '-r', '30', '-c:v', 'libx264', '-profile:v', 'high', '-b:v', '6M',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-movflags', '+faststart', out]);
  await run(['-y', '-ss', '1', '-i', out, '-frames:v', '1', '-q:v', '3', cover]);
  await writeFile(new URL('caption.txt', dirUrl), clip.caption);
  return { files: ['reel.mp4'], cover: 'cover.jpg' };
}

function run(args) {
  return new Promise((ok, fail) => {
    const p = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg ${code}\n${err.slice(-1500)}`))));
  });
}
