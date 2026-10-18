// 용품 카드: 가격 비교(표지·상품·마지막 장), 고르는 법(표지·팁·마지막 장)
import { brand, esc, md, won } from '../util.mjs';
import { page } from './base.mjs';

export const SOURCE = '쿠팡 판매가(ATL골프기어 확인)';
export const TIP_SOURCE = 'ATL골프기어';
export const DISCLOSURE = '이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

export function compareCover(o, cat, items, checked) {
  const prices = items.map((p) => p.pick.price);
  return page({ ...o, source: SOURCE, body: `
<div class="kicker">${esc(cat.name)} 가격 비교</div>
<h1>인기 ${esc(cat.name)}<br>${items.length}종<br>쿠팡 판매가</h1>
<div class="sub">${md(checked)} 확인 가격 · 낮은 가격순</div>
<div class="bottom">
<div style="display:flex;gap:28px">
<div style="flex:1;border-top:3px solid var(--ink);padding-top:14px"><div style="font-size:28px;color:var(--muted)">가장 낮은 가격</div><div class="num" style="font-size:84px;font-weight:800">${esc(won(Math.min(...prices)))}</div></div>
<div style="flex:1;border-top:3px solid var(--ink);padding-top:14px"><div style="font-size:28px;color:var(--muted)">가장 높은 가격</div><div class="num" style="font-size:84px;font-weight:800">${esc(won(Math.max(...prices)))}</div></div>
</div></div>` });
}

export function productCard(o, cat, p, index, count) {
  return page({ ...o, source: SOURCE, body: `
<div class="kicker">${esc(cat.name)} ${index} / ${count}</div>
<h2>${esc(p.name)}</h2>
<div style="margin-top:28px;display:flex;align-items:baseline;gap:20px">
<span class="num" style="font-size:110px;font-weight:800;letter-spacing:-2px">${esc(won(p.pick.price))}</span>
${p.pick.rocket ? '<span class="pill">로켓배송</span>' : ''}</div>
<div style="font-size:26px;color:var(--muted)">${md(p.pick.checked)} 쿠팡 판매가 · 옵션·시기에 따라 달라질 수 있음</div>
<div class="sub" style="margin-top:44px;font-size:34px;color:var(--ink)">${esc(p.summary)}</div>
<div class="bottom" style="margin-bottom:150px">${p.points.slice(0, 2).map((t) => `<div style="font-size:30px;padding:16px 0;border-top:1px solid var(--line)">✓ ${esc(t)}</div>`).join('')}</div>` });
}

export function tipsCover(o, cat, count) {
  return page({ ...o, source: TIP_SOURCE, body: `
<div class="kicker">골퍼를 위한 장비 가이드</div>
<h1>${esc(cat.name)},<br>이것만 보고<br>고르세요</h1>
<div class="sub">${esc(cat.intro)}</div>
<div class="bottom"><span class="num" style="font-size:200px;font-weight:800;color:var(--accent);line-height:.9">${count}</span><span style="font-size:52px;font-weight:900;margin-left:12px">가지 기준</span></div>` });
}

// "로프트: 설명" 처럼 앞쪽 짧은 제목 + 콜론이면 제목·본문으로 나눈다(아니면 null)
export function splitTip(tip) {
  const m = tip.match(/^([^:()]{1,14}):\s*(.+)$/);
  return m ? { head: m[1], body: m[2] } : null;
}
// 카드에 실제로 보이는 글자(검증용)
export const tipText = (tip) => { const s = splitTip(tip); return s ? s.head + s.body : tip; };

export function tipCard(o, cat, tip, index, count) {
  const s = splitTip(tip);
  const hasHead = !!s;
  const head = s?.head, rest = s ? [s.body] : [];
  return page({ ...o, source: TIP_SOURCE, body: `
<div class="kicker">${esc(cat.name)} 고르는 법 ${index} / ${count}</div>
<div class="num" style="margin-top:60px;font-size:220px;font-weight:800;color:var(--accent);line-height:.85">${String(index).padStart(2, '0')}</div>
${hasHead ? `<h2 style="margin-top:40px">${esc(head)}</h2><div class="sub" style="font-size:44px;color:var(--ink);line-height:1.5">${esc(rest.join(': '))}</div>`
    : `<div class="sub" style="margin-top:40px;font-size:52px;color:var(--ink);line-height:1.45;font-weight:700">${esc(tip)}</div>`}` });
}

export function gearEnd(o, { disclosure = true } = {}) {
  return page({ ...o, cls: 'end', source: o.source || SOURCE, body: `
<h2>모델별 자세한 비교와<br>오늘 쿠팡 가격은<br>프로필 링크에서</h2>
<div class="url">${esc(brand.site)}</div>
${brand.handle ? `<div style="margin-top:28px;font-size:34px;font-weight:700">@${esc(brand.handle)} 팔로우하고 매일 받아 보기</div>` : ''}
<div class="bottom note">${disclosure ? `${esc(DISCLOSURE)}<br>` : ''}가격은 확인한 날짜 기준이며 지금은 다를 수 있습니다.</div>` });
}
