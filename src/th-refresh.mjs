// 스레드 장기 토큰 연장: 새 토큰을 표준 출력으로만 내보낸다(워크플로가 암호화해 저장). 로그에 남기지 않는다.
import { refreshThreadsToken } from './threads.mjs';

const { token, expiresIn } = await refreshThreadsToken(process.env.THREADS_ACCESS_TOKEN || '');
process.stdout.write(token);
console.error(`연장됨: ${Math.round(expiresIn / 86400)}일 유효`);
