// 장기 토큰 연장: 새 토큰을 표준 출력으로만 내보낸다(워크플로가 파일로 받아 Secrets 에 저장). 로그에 남기지 않는다.
import { refreshToken } from './instagram.mjs';

const { token, expiresIn } = await refreshToken(process.env.IG_ACCESS_TOKEN || '');
process.stdout.write(token);
console.error(`연장됨: ${Math.round(expiresIn / 86400)}일 유효`);
