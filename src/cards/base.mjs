// 카드 공통 틀 (1080×1350, 인스타 세로 4:5). 색은 golfprice 사이트(초이스골프)와 같게.
import { brand, esc } from '../util.mjs';

export const W = 1080, H = 1350;

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Barlow+Condensed:wght@600;700;800&display=block');
:root{--bg:#f6f7f4;--surface:#fff;--ink:#1c211d;--muted:#5d665f;--line:#e2e6e0;--accent:#1f7a4d;--accent-bg:#e3f3ea;--gold:#6a5d1f}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;background:var(--bg);color:var(--ink);font-family:'Noto Sans KR',sans-serif;word-break:keep-all}
.num{font-family:'Barlow Condensed','Noto Sans KR',sans-serif;font-variant-numeric:tabular-nums}
.card{position:relative;width:${W}px;height:${H}px;padding:80px 80px 0;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center;padding-bottom:24px;border-bottom:3px solid var(--ink)}
.logo{font-size:34px;font-weight:900;letter-spacing:-1px}.logo b{color:var(--accent)}
.top .r{font-size:28px;color:var(--muted);font-weight:500}
.top .r .num{font-size:32px;margin-left:14px;color:var(--ink)}
.foot{position:absolute;left:80px;right:80px;bottom:60px;display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:22px;font-size:24px;color:var(--muted)}
.kicker{margin-top:64px;font-size:32px;font-weight:700;color:var(--accent)}
h1{margin-top:16px;font-size:88px;font-weight:900;line-height:1.15;letter-spacing:-2.5px}
h2{margin-top:16px;font-size:68px;font-weight:900;line-height:1.22;letter-spacing:-2px}
.sub{margin-top:22px;font-size:34px;color:var(--muted);line-height:1.45}
.pill{display:inline-block;font-size:26px;font-weight:700;padding:6px 16px;border-radius:999px;background:var(--accent-bg);color:var(--accent)}
.bottom{margin-top:auto;margin-bottom:160px}
table{width:100%;border-collapse:collapse}
th{font-size:24px;font-weight:500;color:var(--muted);text-align:left;padding:0 0 12px;border-bottom:2px solid var(--ink)}
td{font-size:34px;padding:13px 0;border-bottom:1px solid var(--line);vertical-align:middle}
th.r,td.r{text-align:right}
td.pos{width:110px;font-family:'Barlow Condensed',sans-serif;font-size:40px;font-weight:700}
td .en{font-size:24px;color:var(--muted);margin-left:10px}
tr.ko td{background:var(--accent-bg)}tr.ko td:first-child{box-shadow:inset 8px 0 0 var(--accent);padding-left:18px}
.end h2{margin-top:140px;font-size:76px}
.end .url{margin-top:44px;font-size:48px;font-weight:900;color:var(--accent)}
.end .note{font-size:28px;line-height:1.6;color:var(--muted)}
`;

export function page({ series, n, total, date, source, body, cls = '' }) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="card ${cls}">
<div class="top"><span class="logo"><b>ATL</b>골프기어</span><span class="r">${esc(series)}<span class="num">${n}/${total}</span></span></div>
${body}
<div class="foot"><span>자료: ${esc(source)} · ${esc(date)} 기준</span><span>${esc(brand.site)}</span></div>
</div></body></html>`;
}
