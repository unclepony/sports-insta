// 투어 결과 카드: 표지 · 리더보드 TOP10 · 한국 선수 · 마지막 장
import { brand, displayName, esc, isKorean, koName, md, posLabel, usd } from '../util.mjs';
import { page } from './base.mjs';

export const SOURCE = 'ESPN';

// 국적 한글 표기(모르는 나라는 영문 그대로)
const COUNTRY = {
  'South Korea': '한국', USA: '미국', Japan: '일본', China: '중국', Thailand: '태국', Australia: '호주', England: '잉글랜드',
  Scotland: '스코틀랜드', Ireland: '아일랜드', 'Northern Ireland': '북아일랜드', Wales: '웨일스', Canada: '캐나다', Spain: '스페인',
  France: '프랑스', Germany: '독일', Sweden: '스웨덴', Norway: '노르웨이', Denmark: '덴마크', Finland: '핀란드', Belgium: '벨기에',
  Netherlands: '네덜란드', Italy: '이탈리아', Austria: '오스트리아', Mexico: '멕시코', Colombia: '콜롬비아', Argentina: '아르헨티나',
  Chile: '칠레', 'South Africa': '남아공', 'New Zealand': '뉴질랜드', India: '인도', 'Chinese Taipei': '대만', Philippines: '필리핀',
  Russia: '러시아', Venezuela: '베네수엘라', Paraguay: '파라과이', 'Puerto Rico': '푸에르토리코', Switzerland: '스위스', Poland: '폴란드',
};
export const country = (c) => COUNTRY[c] || c;

export const roundsText = (p) => p.rounds.filter(Boolean).join('·');

const nameCell = (p) => {
  const ko = koName(p);
  return ko ? `<b>${esc(ko)}</b><span class="en">${esc(p.name)}</span>` : `${esc(p.name)}`;
};

export function tourCover(o, ev, { winner, bestKo }) {
  return page({ ...o, source: SOURCE, body: `
<div class="kicker">${esc(ev.leagueName)} · 최종 결과</div>
<h1 style="font-size:${ev.name.length > 26 ? 70 : 86}px">${esc(ev.name)}</h1>
<div class="sub">${md(ev.start)}~${md(ev.end)}${ev.course ? ` · ${esc(ev.course.name)} · 파${ev.course.par}` : ''}</div>
<div class="bottom">
<div style="font-size:30px;color:var(--muted)">우승</div>
<div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--ink);padding:6px 0 20px">
<span style="font-size:60px;font-weight:900">${esc(displayName(winner))}</span>
<span class="num" style="font-size:90px;font-weight:800">${esc(winner.toParText)}</span></div>
${bestKo ? `<div style="font-size:30px;color:var(--accent);font-weight:700;margin-top:40px">한국 선수 최고 성적</div>
<div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0 0">
<span style="font-size:60px;font-weight:900">${esc(displayName(bestKo))}</span>
<span style="font-size:52px;font-weight:900">${esc(posLabel(bestKo.pos))} <span class="num" style="font-size:80px;font-weight:800;margin-left:12px">${esc(bestKo.toParText)}</span></span></div>`
    : '<div style="font-size:34px;color:var(--muted);margin-top:40px">이번 대회 최종 라운드를 마친 한국 선수는 없습니다.</div>'}
</div>` });
}

export function leaderboardCard(o, ev, rows, tail) {
  return page({ ...o, source: SOURCE, body: `
<div class="kicker">${esc(ev.leagueName)} · ${esc(ev.name)}</div>
<h2 style="font-size:60px">최종 순위 TOP 10</h2>
<table style="margin-top:44px"><tr><th>순위</th><th>선수</th><th>국적</th><th class="r">합계</th><th class="r">타수</th></tr>
${rows.map((p) => `<tr class="${isKorean(p) ? 'ko' : ''}"><td class="pos">${esc(p.pos)}</td><td>${nameCell(p)}</td><td style="font-size:28px;color:var(--muted)">${esc(country(p.country))}</td><td class="r num" style="font-size:42px;font-weight:700">${esc(p.toParText)}</td><td class="r num" style="font-size:36px;color:var(--muted)">${p.total ?? ''}</td></tr>`).join('')}
${tail ? `<tr class="${tail.players.some(isKorean) ? 'ko' : ''}"><td class="pos">${esc(tail.pos)}</td><td colspan="3" style="font-size:28px">${tail.players.map((p) => esc(displayName(p))).join(', ')}</td><td class="r num" style="font-size:42px;font-weight:700">${esc(tail.toParText)}</td></tr>` : ''}
</table>` });
}

export function koreansCard(o, ev, rows, part) {
  return page({ ...o, source: SOURCE, body: `
<div class="kicker">${esc(ev.leagueName)} · ${esc(ev.name)}</div>
<h2 style="font-size:60px">한국 선수 성적${part ? ` (${part})` : ''}</h2>
<table style="margin-top:44px"><tr><th>순위</th><th>선수</th><th class="r">합계</th><th class="r">라운드</th><th class="r">상금</th></tr>
${rows.map((p) => `<tr><td class="pos">${p.status === 'STATUS_FINISH' ? esc(p.pos) : '—'}</td><td><b>${esc(displayName(p))}</b></td><td class="r num" style="font-size:42px;font-weight:700">${esc(p.toParText)}</td><td class="r num" style="font-size:30px;color:var(--muted)">${esc(roundsText(p))}</td><td class="r num" style="font-size:32px">${p.status === 'STATUS_FINISH' && p.earnings ? esc(usd(p.earnings)) : ''}</td></tr>`).join('')}
</table>
<div style="margin-top:20px;font-size:24px;color:var(--muted)">${rows.some((p) => p.status !== 'STATUS_FINISH') ? '— : 최종 순위 없음 · ' : ''}상금은 미국 달러</div>` });
}

export function tourEnd(o, ev) {
  return page({ ...o, cls: 'end', source: SOURCE, body: `
<h2>내게 맞는 클럽 비교와<br>쿠팡 가격은<br>프로필 링크에서</h2>
<div class="url">${esc(brand.site)}</div>
${brand.handle ? `<div style="margin-top:28px;font-size:34px;font-weight:700">@${esc(brand.handle)} 팔로우하고 매일 받아 보기</div>` : ''}
<div class="bottom note">대회 기록은 ESPN 공개 자료를 그대로 옮겼습니다.<br>${ev.next ? `다음 대회: ${esc(ev.next.name)} (${md(ev.next.start)} 시작)<br>` : ''}잘못된 내용은 댓글로 알려 주시면 바로 고칩니다.</div>` });
}
