// 게시 전 기계 검증. 승인 없이 올리므로 이 검사가 사람 대신이다.
// 하나라도 실패하면 그 게시물은 올리지 않는다(호출한 쪽이 건너뛰고 오류 보고).
//  1) 사실(fact)마다 원본 파일을 디스크에서 새로 읽어 같은 위치의 값과 정확히 같은지
//  2) 카드 글자(HTML) 안에 그 값이 그대로 들어 있는지 — 템플릿이 바꾸거나 빠뜨리지 않았는지
//  3) 게시물이 정한 데이터 이상 검사(타수 합계, 순위, 가격 범위 등)
import { readFileSync } from 'node:fs';

const norm = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, '');

// path 예: ['players', { id: '9945' }, 'toParText']
function resolvePath(obj, path) {
  let cur = obj;
  for (const step of path) {
    if (cur == null) return undefined;
    if (typeof step === 'object') {
      const [k, v] = Object.entries(step)[0];
      cur = Array.isArray(cur) ? cur.find((x) => String(x?.[k]) === String(v)) : undefined;
    } else cur = cur[step];
  }
  return cur;
}

export function validatePost(post, rawDir) {
  const errors = [];
  const fresh = {};
  const load = (src) => (fresh[src] ??= JSON.parse(readFileSync(new URL(`${src}.json`, rawDir), 'utf8')));
  for (const card of post.cards) {
    const text = norm(card.html);
    for (const f of card.facts || []) {
      let original;
      try { original = resolvePath(load(f.src), f.path); } catch (e) { errors.push(`${card.name}: 원본 ${f.src} 읽기 실패 ${e.message}`); continue; }
      const want = original === undefined ? undefined : f.expect ? f.expect(original) : original;
      if (want === undefined) errors.push(`${card.name}: 원본에 ${f.src}/${JSON.stringify(f.path)} 없음`);
      else if (String(want) !== String(f.value)) errors.push(`${card.name}: ${f.path.at(-1)} 원본 "${want}" ≠ 카드 "${f.value}"`);
      if (f.shown !== false && !text.includes(norm(f.value))) errors.push(`${card.name}: "${f.value}" 가 카드 글자에 없음`);
    }
  }
  for (const check of post.checks || []) {
    const msg = check(load);
    if (msg) errors.push(msg);
  }
  if (post.caption.length > 2200) errors.push(`캡션 ${post.caption.length}자 — 인스타 한도 2,200자 초과`);
  if ((post.caption.match(/#/g) || []).length > 30) errors.push('해시태그 30개 초과');
  if (!post.single && (post.cards.length < 2 || post.cards.length > 10)) errors.push(`카드 ${post.cards.length}장 — 캐러셀은 2~10장`);
  return errors;
}
