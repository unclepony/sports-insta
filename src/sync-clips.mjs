// golfvideo 가 만든 초보 Q&A 팁 쇼츠(t-*.mp4 + .json)를 media/clips/ 로 복사한다(커밋해서 Actions 가 릴스로 올림).
// golfvideo 영상은 직접 그린 일러스트·직접 만든 배경음이라 재활용 가능(남의 사진·영상·로고 없음).
// 사용: node src/sync-clips.mjs   (golfvideo 위치: GOLFVIDEO_DIR, 기본 ../golfvideo)
// 주의: golfvideo 매일 작업(07시, golfvideo 3ed0acb)이 이 명령을 그대로 부르고 media/clips 만 커밋·푸시한다.
//       명령·인자·경로(out/t-*.json·mp4 → media/clips/)를 바꾸려면 먼저 unclepony.com 유지보수 세션과 맞춘다.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './util.mjs';

const src = resolve(process.env.GOLFVIDEO_DIR || fileURLToPath(new URL('../golfvideo', ROOT)), 'out');
const dst = fileURLToPath(new URL('media/clips/', ROOT));
mkdirSync(dst, { recursive: true });
let n = 0;
for (const f of readdirSync(src).filter((x) => /^t-.*\.json$/.test(x))) {
  const meta = JSON.parse(readFileSync(resolve(src, f), 'utf8'));
  const mp4 = f.replace(/\.json$/, '.mp4');
  if (meta.format !== 'shorts' || meta.type !== 'tip' || !existsSync(resolve(src, mp4))) continue;
  if (statSync(resolve(src, mp4)).size > 50e6) continue; // 너무 큰 파일은 저장소에 넣지 않음
  if (existsSync(resolve(dst, mp4)) && statSync(resolve(dst, mp4)).size === statSync(resolve(src, mp4)).size) continue;
  copyFileSync(resolve(src, mp4), resolve(dst, mp4));
  copyFileSync(resolve(src, f), resolve(dst, f));
  console.log(`+ ${mp4} — ${meta.title}`);
  n++;
}
console.log(`새 클립 ${n}개 (media/clips/)`);
