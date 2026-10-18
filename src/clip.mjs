// ATL골프기어 초보 Q&A 팁 쇼츠를 인스타 릴스로 다시 올리기.
// 원본: media/clips/<에피소드>.mp4 + .json (src/sync-clips.mjs 가 golfvideo/out 에서 복사, 직접 만든 영상만).
// 캡션은 영상 설명의 Q·A 줄을 그대로 쓴다(새로 지어내지 않음).
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';
import { ROOT, brand, readJson } from './util.mjs';
import { DISCLOSURE } from './cards/gear.mjs';

const CLIPS = new URL('media/clips/', ROOT);

export function clipCandidates(state) {
  if (!existsSync(CLIPS)) return [];
  return readdirSync(CLIPS).filter((f) => f.endsWith('.json')).sort()
    .map((f) => ({ file: f.replace(/\.json$/, ''), meta: readJson(new URL(f, CLIPS)) }))
    .filter(({ file, meta }) => meta.format === 'shorts' && existsSync(new URL(`${file}.mp4`, CLIPS)) && !state.posted?.[`clip-${file}`])
    .map(({ file, meta }) => {
      const qa = (meta.description || '').split('\n').filter((l) => /^[QA]\.\s/.test(l));
      const tags = [...new Set([...(meta.description || '').matchAll(/#[^\s#]+/g)].map((m) => m[0]).filter((t) => t !== '#shorts'))];
      return {
        id: `clip-${file}`, kind: 'clip', series: 'ATL골프기어 초보 Q&A', file, category: meta.guide || null,
        caption: [
          meta.title.replace(/\s*#shorts/gi, '').trim(),
          '',
          ...qa,
          '',
          '📌 저장해 두고 클럽 살 때 다시 보세요',
          `🏌️ 모델별 비교·쿠팡 가격은 프로필 링크(${brand.site})`,
          '',
          '영상의 그림과 배경음은 ATL골프기어가 직접 만들었습니다.',
          DISCLOSURE,
          '',
          [...tags, '#골프초보', '#골프스타그램', '#ATL골프기어'].filter((t, i, a) => a.indexOf(t) === i).slice(0, 8).join(' '),
        ].join('\n'),
        warnings: [],
      };
    });
}

// 세로 1080×1920·H.264·AAC 로 다시 인코딩(인스타 릴스 규격), 90초로 자른다. 표지는 1초 장면.
export async function renderClip(clip, dirUrl) {
  await mkdir(dirUrl, { recursive: true });
  const input = fileURLToPath(new URL(`${clip.file}.mp4`, CLIPS));
  const out = fileURLToPath(new URL('reel.mp4', dirUrl));
  const cover = fileURLToPath(new URL('cover.jpg', dirUrl));
  const vf = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0b2f20,setsar=1,format=yuv420p';
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
