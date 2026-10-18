// 한국 시간 기준 날짜(YYYY-MM-DD)
export function today() {
  return new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "2026-10-16" → "10월 16일"
export function md(d) {
  const [, m, day] = d.split('-').map(Number);
  return `${m}월 ${day}일`;
}

// 법안명 "OO법 일부개정법률안(대안)(OO위원장)" → 본 이름과 괄호 꼬리로 나눈다(글자는 그대로).
export function splitBillName(name) {
  const m = name.match(/^(.*?)((?:\([^()]*\))+)$/);
  return m ? { main: m[1], tail: m[2] } : { main: name, tail: '' };
}
