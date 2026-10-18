// v2 디자인(테스트) — 2026-10-18 벤치마킹(@lpga_tour, @pgatour, 카드뉴스 저장 공식) 반영
//  · 표지는 '제목'이 아니라 '한 줄 이야기'(데이터로 만든 후킹 문구) + 핵심 숫자 하나를 크게
//  · 짙은 초록 바탕 + 금색 강조(ATL골프기어 로고 색), 굵은 압축 서체, 강조 숫자는 금색 상자
//  · 스코어카드: 언더파 라운드는 금색 동그라미(LPGA 스코어카드 방식)
//  · 표지에 '넘겨 보기 →', 마지막 장은 '저장·팔로우' 한 가지 행동만
//  · 사진은 여전히 쓰지 않는다(저작권) — 대신 글자·숫자·도형으로 채운다
import { brand, esc } from '../util.mjs';

export const W = 1080, H = 1350;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;500;700;900&family=Barlow+Condensed:ital,wght@0,600;0,800;1,800&display=block');
:root{--bg:#0f3d2a;--bg2:#0b2f20;--ink:#fff;--muted:#a8c2b4;--gold:#e9c46a;--gold-ink:#1b1405;--line:rgba(255,255,255,.14)}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;background:var(--bg);color:var(--ink);font-family:'Noto Sans KR',sans-serif;word-break:keep-all}
.card{position:relative;width:${W}px;height:${H}px;padding:72px 76px 0;display:flex;flex-direction:column;overflow:hidden;
 background:radial-gradient(1200px 700px at 110% -10%,rgba(233,196,106,.16),transparent 60%),linear-gradient(180deg,var(--bg),var(--bg2))}
.card:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.025) 0 2px,transparent 2px 28px);pointer-events:none}
.hd{position:relative;display:flex;justify-content:space-between;align-items:center;font-size:28px;font-weight:700}
.hd .brand{display:flex;align-items:center;gap:12px}.hd .brand i{width:16px;height:16px;border-radius:50%;background:var(--gold)}
.hd .pg{font-family:'Barlow Condensed';font-size:34px;color:var(--muted)}
.ft{position:absolute;left:76px;right:76px;bottom:54px;display:flex;justify-content:space-between;font-size:22px;color:var(--muted)}
.disp{font-family:'Black Han Sans','Noto Sans KR',sans-serif;font-weight:400;letter-spacing:-1px;line-height:1.08}
.num{font-family:'Barlow Condensed',sans-serif;font-variant-numeric:tabular-nums}
.chip{display:inline-block;font-size:26px;font-weight:900;padding:8px 18px;background:var(--gold);color:var(--gold-ink);letter-spacing:.5px}
.chip.o{background:transparent;color:var(--gold);border:3px solid var(--gold)}
.hl{background:var(--gold);color:var(--gold-ink);padding:0 14px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.swipe{position:absolute;right:76px;bottom:110px;font-size:28px;font-weight:900;color:var(--gold)}
table{width:100%;border-collapse:collapse}
th{font-size:22px;font-weight:500;color:var(--muted);text-align:left;padding:0 0 12px;border-bottom:2px solid var(--gold)}
td{font-size:34px;padding:13px 0;border-bottom:1px solid var(--line);vertical-align:middle}
th.r,td.r{text-align:right}
td.pos{width:110px;font-family:'Barlow Condensed';font-size:42px;font-weight:800}
tr.ko td{color:var(--gold)}tr.ko td.nm b:after{content:'KOR';font-size:18px;font-weight:900;margin-left:10px;padding:2px 6px;background:var(--gold);color:var(--gold-ink);vertical-align:middle}
td .en{font-size:22px;color:var(--muted);margin-left:10px}
`;

export function page({ n, total, date, source, body, swipe = '' }) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="card"><div class="hd"><span class="brand"><i></i>ATL골프기어${brand.handle ? ` <span style="color:var(--muted);font-weight:500">@${esc(brand.handle)}</span>` : ''}</span><span class="pg">${n}/${total}</span></div>
${body}
${swipe ? `<div class="swipe">${esc(swipe)} →</div>` : ''}
<div class="ft"><span>자료: ${esc(source)} · ${esc(date)} 기준</span><span>${esc(brand.site)}</span></div>
</div></body></html>`;
}

// 표지: 후킹 문구 2줄(둘째 줄 일부 금색) + 핵심 숫자 + 아래 띠 2칸
export function tourCoverV2(o, ev, { kicker, line1, line2, hl, bigNum, bigLabel, stats }) {
  const l2 = hl && line2.includes(hl) ? esc(line2).replace(esc(hl), `<span class="hl">${esc(hl)}</span>`) : esc(line2);
  return page({ ...o, source: 'ESPN', swipe: '넘겨서 전체 순위', body: `
<div style="margin-top:56px"><span class="chip">${esc(kicker)}</span></div>
<div class="disp" style="margin-top:34px;font-size:${line1.length > 9 ? 100 : 124}px">${esc(line1)}</div>
<div class="disp" style="margin-top:10px;font-size:112px">${l2}</div>
<div style="margin-top:auto;display:flex;align-items:flex-end;gap:22px">
<span class="num" style="font-size:300px;font-weight:800;font-style:italic;line-height:.78;color:var(--gold)">${esc(bigNum)}</span>
<span style="font-size:34px;font-weight:700;color:var(--muted);padding-bottom:16px">${esc(bigLabel)}</span></div>
<div style="margin:44px 0 170px;display:grid;grid-template-columns:1fr 1fr;border-top:2px solid var(--gold)">
${stats.map((s) => `<div style="padding:18px 0 0"><div style="font-size:24px;color:var(--muted)">${esc(s.label)}</div><div style="font-size:40px;font-weight:900;margin-top:4px">${esc(s.value)}</div></div>`).join('')}
</div>` });
}

// 스코어카드: 라운드별 타수, 언더파는 금색 동그라미, 오버파는 네모
export function scorecardV2(o, ev, p, name, par, posText) {
  const cells = p.rounds.map((r, i) => {
    if (!r) return `<div style="text-align:center"><div style="font-size:26px;color:var(--muted)">R${i + 1}</div><div class="num" style="font-size:80px;color:var(--muted)">—</div></div>`;
    const d = par ? r - par : null;
    const style = d < 0 ? 'background:var(--gold);color:var(--gold-ink);border-radius:50%' : d > 0 ? 'border:4px solid var(--muted)' : 'border:4px solid transparent';
    return `<div style="text-align:center"><div style="font-size:26px;color:var(--muted)">R${i + 1}</div>
<div class="num" style="margin:12px auto 0;width:170px;height:170px;display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:800;${style}">${r}</div>
${d !== null ? `<div class="num" style="margin-top:10px;font-size:40px;font-weight:600;color:${d < 0 ? 'var(--gold)' : 'var(--muted)'}">${d === 0 ? 'E' : d > 0 ? `+${d}` : d}</div>` : ''}</div>`;
  });
  return page({ ...o, source: 'ESPN', body: `
<div style="margin-top:56px"><span class="chip o">${esc(ev.leagueName)} · ${esc(ev.name)}</span></div>
<div class="disp" style="margin-top:30px;font-size:110px">${esc(name)}</div>
<div style="font-size:34px;color:var(--muted);margin-top:8px">라운드별 기록${par ? ` · 파${par}` : ''}</div>
<div style="margin-top:60px;display:grid;grid-template-columns:repeat(${cells.length},1fr);gap:10px">${cells.join('')}</div>
<div style="margin:auto 0 170px;display:flex;justify-content:space-between;align-items:flex-end;border-top:2px solid var(--gold);padding-top:22px">
<div><div style="font-size:26px;color:var(--muted)">최종</div><div class="disp" style="font-size:72px">${esc(posText)}</div></div>
<div style="text-align:right"><div style="font-size:26px;color:var(--muted)">합계</div><div class="num" style="font-size:110px;font-weight:800;font-style:italic;line-height:.9;color:var(--gold)">${esc(p.toParText)}</div><div class="num" style="font-size:34px;color:var(--muted)">${p.total}타</div></div>
</div>` });
}

export function leaderboardV2(o, ev, rows, tail, { nameCell, country }) {
  return page({ ...o, source: 'ESPN', body: `
<div style="margin-top:56px"><span class="chip o">${esc(ev.leagueName)} · ${esc(ev.name)}</span></div>
<div class="disp" style="margin-top:24px;font-size:84px">최종 순위 TOP 10</div>
<table style="margin-top:36px"><tr><th>순위</th><th>선수</th><th>국적</th><th class="r">합계</th></tr>
${rows.map((p) => `<tr class="${p.country === 'South Korea' ? 'ko' : ''}"><td class="pos">${esc(p.pos)}</td><td class="nm">${nameCell(p)}</td><td style="font-size:26px;color:var(--muted)">${esc(country(p.country))}</td><td class="r num" style="font-size:46px;font-weight:800">${esc(p.toParText)}</td></tr>`).join('')}
${tail ? `<tr class="${tail.players.some((p) => p.country === 'South Korea') ? 'ko' : ''}"><td class="pos">${esc(tail.pos)}</td><td colspan="2" style="font-size:26px">${tail.players.map((p) => esc(p.display)).join(', ')}</td><td class="r num" style="font-size:46px;font-weight:800">${esc(tail.toParText)}</td></tr>` : ''}
</table>` });
}

export function koreansV2(o, ev, rows, part, { posLabelOf, display, roundsText, usd }) {
  return page({ ...o, source: 'ESPN', body: `
<div style="margin-top:56px"><span class="chip">한국 선수</span></div>
<div class="disp" style="margin-top:24px;font-size:84px">한국 선수 성적표${part ? ` ${esc(part)}` : ''}</div>
<table style="margin-top:36px"><tr><th>순위</th><th>선수</th><th class="r">합계</th><th class="r">라운드</th><th class="r">상금</th></tr>
${rows.map((p) => `<tr><td class="pos" style="color:var(--gold)">${p.status === 'STATUS_FINISH' ? esc(p.pos) : '—'}</td><td><b>${esc(display(p))}</b></td><td class="r num" style="font-size:44px;font-weight:800">${esc(p.toParText)}</td><td class="r num" style="font-size:28px;color:var(--muted)">${esc(roundsText(p))}</td><td class="r num" style="font-size:30px">${p.status === 'STATUS_FINISH' && p.earnings ? esc(usd(p.earnings)) : ''}</td></tr>`).join('')}
</table>
<div style="margin-top:18px;font-size:22px;color:var(--muted)">${rows.some((p) => p.status !== 'STATUS_FINISH') ? '— : 최종 순위 없음 · ' : ''}상금은 미국 달러</div>` });
}

export function endV2(o, { source, title, sub, disclosure }) {
  return page({ ...o, source, body: `
<div class="disp" style="margin-top:170px;font-size:104px">${title}</div>
<div style="margin-top:34px;font-size:38px;line-height:1.5;color:var(--muted)">${sub}</div>
<div style="margin-top:56px;display:flex;gap:16px;flex-wrap:wrap">
<span class="chip">저장해 두기</span><span class="chip o">@${esc(brand.handle || 'atlgolfgear')} 팔로우</span></div>
<div style="margin-top:28px;font-size:40px;font-weight:900;color:var(--gold)">${esc(brand.site)}</div>
${disclosure ? `<div style="margin:auto 0 150px;font-size:24px;line-height:1.6;color:var(--muted)">${esc(disclosure)}</div>` : ''}` });
}

// 용품 가격 비교 표지: "최저가와 최고가 차이 N원" 후킹
export function compareCoverV2(o, { kicker, line1, line2, hl, low, high, checkedText }) {
  const l2 = hl && line2.includes(hl) ? esc(line2).replace(esc(hl), `<span class="hl">${esc(hl)}</span>`) : esc(line2);
  return page({ ...o, source: '쿠팡 판매가(ATL골프기어 확인)', swipe: '넘겨서 모델별 가격', body: `
<div style="margin-top:56px"><span class="chip">${esc(kicker)}</span></div>
<div class="disp" style="margin-top:34px;font-size:112px">${esc(line1)}</div>
<div class="disp" style="margin-top:10px;font-size:104px">${l2}</div>
<div style="margin-top:auto;margin-bottom:170px">
<div style="display:grid;grid-template-columns:1fr 1fr;border-top:2px solid var(--gold)">
<div style="padding-top:18px"><div style="font-size:26px;color:var(--muted)">가장 싼 모델</div><div class="num" style="font-size:84px;font-weight:800;font-style:italic">${esc(low)}</div></div>
<div style="padding-top:18px"><div style="font-size:26px;color:var(--muted)">가장 비싼 모델</div><div class="num" style="font-size:84px;font-weight:800;font-style:italic">${esc(high)}</div></div></div>
<div style="margin-top:14px;font-size:24px;color:var(--muted)">${esc(checkedText)}</div></div>` });
}

export function productV2(o, { index, count, name, price, rocket, checkedText, summary, points, rankLabel }) {
  return page({ ...o, source: '쿠팡 판매가(ATL골프기어 확인)', body: `
<div style="margin-top:56px;display:flex;gap:12px"><span class="chip o">${index} / ${count}</span>${rankLabel ? `<span class="chip">${esc(rankLabel)}</span>` : ''}</div>
<div class="disp" style="margin-top:30px;font-size:84px">${esc(name)}</div>
<div style="margin-top:34px;display:flex;align-items:baseline;gap:18px">
<span class="num" style="font-size:150px;font-weight:800;font-style:italic;line-height:.9;color:var(--gold)">${esc(price)}</span>
${rocket ? '<span class="chip o">로켓배송</span>' : ''}</div>
<div style="margin-top:10px;font-size:24px;color:var(--muted)">${esc(checkedText)}</div>
<div style="margin-top:40px;font-size:36px;line-height:1.55">${esc(summary)}</div>
<div style="margin:auto 0 150px">${points.map((t) => `<div style="font-size:30px;padding:16px 0;border-top:1px solid var(--line)"><span style="color:var(--gold);font-weight:900">✓</span> ${esc(t)}</div>`).join('')}</div>` });
}
