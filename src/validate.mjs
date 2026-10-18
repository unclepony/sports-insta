// 게시 전 기계 검증. 승인 없이 올리므로 이 검사가 사람 대신이다.
// 하나라도 실패하면 그 게시물은 만들지 않는다(호출한 쪽이 건너뛰고 오류 보고).
//  1) 사실(fact)마다 원본 데이터의 같은 레코드·필드 값과 정확히 같은지
//  2) 렌더링될 HTML 글자 안에 그 값이 그대로 들어 있는지(템플릿이 바꾸거나 빠뜨리지 않았는지)
//  3) 데이터 이상(표결 합계가 재석보다 큼 등)

const norm = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, '');

export function validatePost(post, raw) {
  const errors = [];
  for (const card of post.cards) {
    const text = norm(card.html);
    for (const f of card.facts) {
      if (f.computed) {
        // 표지 숫자처럼 원본에서 계산한 값: 계산을 다시 해서 대조
        const again = f.recompute(raw);
        if (String(again) !== String(f.value)) errors.push(`${card.name}: ${f.label} 재계산 ${again} ≠ ${f.value}`);
      } else {
        const row = raw[f.ds]?.rows.find((r) => r.BILL_ID === f.id);
        if (!row) { errors.push(`${card.name}: 원본에 ${f.ds}/${f.id} 없음`); continue; }
        if (String(row[f.field]) !== String(f.value)) errors.push(`${card.name}: ${f.field} 원본 "${row[f.field]}" ≠ "${f.value}"`);
      }
      if (f.shown !== false && !text.includes(norm(f.value))) errors.push(`${card.name}: "${f.value}" 가 카드 글자에 없음`);
    }
    for (const check of card.checks || []) {
      const msg = check();
      if (msg) errors.push(`${card.name}: ${msg}`);
    }
  }
  return errors;
}
