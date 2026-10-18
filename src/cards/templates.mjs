// 카드 HTML 템플릿 (1080×1350, 인스타 세로 4:5)
// 색은 흑백만 쓴다: 어떤 색이든 특정 정당 색으로 읽힐 수 있어서(중립 원칙).
import { esc, md, splitBillName } from '../util.mjs';

export const SITE = 'politics.unclepony.com'; // 가칭
export const W = 1080, H = 1350;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Serif+KR:wght@600;900&display=block');
:root{--paper:#f6f5f1;--ink:#141414;--mid:#6b6a66;--line:#d9d7d0;--soft:#e9e7e1}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;background:var(--paper);color:var(--ink);font-family:'Noto Sans KR',sans-serif;word-break:keep-all}
.card{position:relative;width:${W}px;height:${H}px;padding:88px 84px 0;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:baseline;border-bottom:4px solid var(--ink);padding-bottom:22px;font-size:30px;font-weight:700;letter-spacing:-.5px}
.top .page{font-weight:500;color:var(--mid);font-variant-numeric:tabular-nums}
.foot{position:absolute;left:84px;right:84px;bottom:64px;display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:22px;font-size:24px;color:var(--mid)}
.sample{position:absolute;top:30px;right:84px;font-size:22px;font-weight:700;color:var(--paper);background:var(--ink);padding:4px 12px}
.serif{font-family:'Noto Serif KR',serif}
/* 표지 */
.cover .date{margin-top:120px;font-size:44px;font-weight:500;color:var(--mid)}
.cover h1{margin-top:20px;font-family:'Noto Serif KR',serif;font-weight:900;font-size:92px;line-height:1.18;letter-spacing:-2px}
.cover .big{margin-top:auto;margin-bottom:190px;display:flex;align-items:baseline;gap:18px}
.cover .big b{font-size:300px;font-weight:900;line-height:.9;letter-spacing:-10px;font-variant-numeric:tabular-nums}
.cover .big span{font-size:64px;font-weight:700}
.cover .sub{font-size:30px;color:var(--mid);margin-top:-160px;margin-bottom:150px}
/* 법안 */
.bill .kicker{margin-top:70px;font-size:30px;font-weight:700;color:var(--mid)}
.bill h2{margin-top:18px;font-family:'Noto Serif KR',serif;font-weight:900;font-size:76px;line-height:1.25;letter-spacing:-1.5px}
.bill .tail{margin-top:18px;font-size:34px;color:var(--mid);line-height:1.4}
.meta{margin-top:auto;margin-bottom:170px;border-top:1px solid var(--line)}
.meta div{display:flex;justify-content:space-between;gap:30px;padding:24px 0;border-bottom:1px solid var(--line);font-size:34px}
.meta dt{color:var(--mid);flex:none}
.meta dd{font-weight:700;text-align:right}
/* 표결 */
.result{display:inline-block;margin-top:34px;font-size:38px;font-weight:900;border:4px solid var(--ink);padding:6px 22px}
.votes{margin-top:auto;margin-bottom:170px}
.bar{display:flex;height:64px;border:3px solid var(--ink);margin-bottom:34px}
.bar i{display:block;height:100%}
.bar .y{background:var(--ink)}
.bar .n{background:repeating-linear-gradient(45deg,var(--ink) 0 6px,var(--paper) 6px 14px)}
.bar .a{background:var(--soft)}
.nums{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.nums div{border-top:3px solid var(--ink);padding-top:14px}
.nums dt{font-size:30px;color:var(--mid);display:flex;align-items:center;gap:10px}
.nums dt i{width:26px;height:26px;border:2px solid var(--ink)}
.nums dd{font-size:96px;font-weight:900;letter-spacing:-3px;font-variant-numeric:tabular-nums}
.nums dd small{font-size:36px;font-weight:700;margin-left:4px}
.turnout{margin-top:26px;font-size:30px;color:var(--mid)}
/* 마지막 장 */
.end h2{margin-top:150px;font-family:'Noto Serif KR',serif;font-weight:900;font-size:80px;line-height:1.25;letter-spacing:-1.5px}
.end .url{margin-top:50px;font-size:46px;font-weight:700;border-bottom:4px solid var(--ink);display:inline-block;padding-bottom:6px}
.end .note{margin-top:auto;margin-bottom:180px;font-size:32px;line-height:1.6;color:var(--mid)}
`;

function page({ series, n, total, sample, body, cls, date }) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="card ${cls}">${sample ? '<div class="sample">샘플 데이터 미리보기</div>' : ''}
<div class="top"><span>${esc(series)}</span><span class="page">${n} / ${total}</span></div>
${body}
<div class="foot"><span>자료: 열린국회정보 · ${esc(date)} 기준</span><span>${SITE}</span></div>
</div></body></html>`;
}

export function cover({ series, n, total, sample, date, dateLabel, title, count, unit, sub }) {
  return page({ series, n, total, sample, date, cls: 'cover', body: `
<div class="date">${esc(dateLabel)}</div>
<h1>${esc(title)}</h1>
<div class="big"><b>${esc(count)}</b><span>${esc(unit)}</span></div>
${sub ? `<div class="sub">${esc(sub)}</div>` : ''}` });
}

export function billCard({ series, n, total, sample, date, bill, index, count }) {
  const { main, tail } = splitBillName(bill.BILL_NAME);
  return page({ series, n, total, sample, date, cls: 'bill', body: `
<div class="kicker">발의 법안 ${index} / ${count}</div>
<h2>${esc(main)}</h2>
${tail ? `<div class="tail">${esc(tail)}</div>` : ''}
<dl class="meta">
<div><dt>발의자</dt><dd>${esc(bill.PROPOSER)}</dd></div>
<div><dt>발의일</dt><dd>${esc(bill.PROPOSE_DT)}</dd></div>
${bill.COMMITTEE ? `<div><dt>소관위원회</dt><dd>${esc(bill.COMMITTEE)}</dd></div>` : ''}
<div><dt>의안번호</dt><dd>${esc(bill.BILL_NO)}</dd></div>
</dl>` });
}

export function voteCard({ series, n, total, sample, date, bill, index, count }) {
  const { main, tail } = splitBillName(bill.BILL_NAME);
  const v = bill.VOTE_TCNT || 1;
  const pct = (x) => `${(x / v) * 100}%`;
  return page({ series, n, total, sample, date, cls: 'bill', body: `
<div class="kicker">본회의 처리 ${index} / ${count}</div>
<h2 style="font-size:66px">${esc(main)}</h2>
${tail ? `<div class="tail">${esc(tail)}</div>` : ''}
<div><span class="result">${esc(bill.PROC_RESULT_CD)}</span></div>
<div class="votes">
<div class="bar"><i class="y" style="width:${pct(bill.YES_TCNT)}"></i><i class="n" style="width:${pct(bill.NO_TCNT)}"></i><i class="a" style="width:${pct(bill.BLANK_TCNT)}"></i></div>
<dl class="nums">
<div><dt><i style="background:var(--ink)"></i>찬성</dt><dd>${bill.YES_TCNT}<small>명</small></dd></div>
<div><dt><i style="background:repeating-linear-gradient(45deg,var(--ink) 0 4px,var(--paper) 4px 9px)"></i>반대</dt><dd>${bill.NO_TCNT}<small>명</small></dd></div>
<div><dt><i style="background:var(--soft)"></i>기권</dt><dd>${bill.BLANK_TCNT}<small>명</small></dd></div>
</dl>
<div class="turnout">재석 ${bill.VOTE_TCNT}명 · 재적 ${bill.MEMBER_TCNT}명 · 처리일 ${esc(bill.PROC_DT)}</div>
</div>` });
}

export function endCard({ series, n, total, sample, date, rest }) {
  return page({ series, n, total, sample, date, cls: 'end', body: `
<h2>${rest ? `나머지 ${rest}건과<br>` : ''}법안 원문·표결 기록은<br>프로필 링크에서</h2>
<div class="url">${SITE}</div>
<div class="note">국회가 공개한 자료를 그대로 옮겼습니다.<br>평가나 의견은 담지 않습니다.<br>잘못된 내용은 댓글로 알려 주시면 바로 고칩니다.</div>` });
}

export { md };
