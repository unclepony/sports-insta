// 원본 데이터 → 게시물(카드 목록 + 캡션). 문장은 템플릿만 쓴다(AI 문장 생성 없음).
import { billCard, cover, endCard, voteCard, SITE } from './cards/templates.mjs';
import { md } from './util.mjs';

const MAX_ITEMS = 8; // 캐러셀 10장 = 표지 + 8 + 마지막 장

const fact = (ds, id, field, value) => ({ ds, id, field, value });

function latest(rows, field) {
  const d = rows.map((r) => r[field]).filter(Boolean).sort().at(-1);
  return { date: d, rows: rows.filter((r) => r[field] === d) };
}

function finish(post, sample) {
  const total = post.cards.length;
  post.cards.forEach((c, i) => { c.html = c.make({ n: i + 1, total, sample, date: post.date }); });
  return post;
}

// 오늘의 국회 — 가장 최근 발의일의 의원 발의 법안
export function billsPost(raw) {
  const sample = raw.bills.sample;
  const { date, rows } = latest(raw.bills.rows, 'PROPOSE_DT');
  if (!rows.length) return null;
  const series = '오늘의 국회 · 발의 법안';
  const items = rows.slice(0, MAX_ITEMS);
  const count = rows.length;
  const recount = (r) => latest(r.bills.rows, 'PROPOSE_DT').rows.length;
  const cards = [
    { name: 'cover', facts: [{ computed: true, label: '발의 건수', value: count, recompute: recount }],
      make: (o) => cover({ ...o, series, dateLabel: `${md(date)} 국회`, title: '새로 발의된 법안', count, unit: '건', sub: sample ? '샘플 데이터 5건만 받은 미리보기' : '' }) },
    ...items.map((b, i) => ({
      name: `bill-${i + 1}`,
      facts: ['BILL_NAME', 'PROPOSER', 'PROPOSE_DT', 'BILL_NO', ...(b.COMMITTEE ? ['COMMITTEE'] : [])].map((f) => fact('bills', b.BILL_ID, f, b[f])),
      make: (o) => billCard({ ...o, series, bill: b, index: i + 1, count }),
    })),
    { name: 'end', facts: [], make: (o) => endCard({ ...o, series, rest: count - items.length }) },
  ];
  const caption = [
    `${md(date)} 국회의원이 발의한 법안 ${count}건${sample ? ' (샘플 미리보기)' : ''}`,
    '',
    ...items.map((b, i) => `${i + 1}. ${b.BILL_NAME} — ${b.PROPOSER}`),
    ...(count > items.length ? [`외 ${count - items.length}건`] : []),
    '',
    `법안 원문은 프로필 링크(${SITE})에서 볼 수 있습니다.`,
    `자료: 열린국회정보(open.assembly.go.kr), ${date} 기준. 공개 자료를 그대로 옮겼으며 평가나 의견은 담지 않습니다.`,
    '',
    '#국회 #법안 #오늘의국회',
  ].join('\n');
  return finish({ id: `bills-${date}`, date, series, cards, caption }, sample);
}

// 본회의 처리 결과 — 가장 최근 본회의의 법률안 표결
export function plenaryPost(raw) {
  const sample = raw.plenary.sample;
  const { date, rows } = latest(raw.plenary.rows, 'PROC_DT');
  if (!rows.length) return null;
  const series = '본회의 표결 결과';
  const items = rows.slice(0, MAX_ITEMS);
  const count = rows.length;
  const passed = rows.filter((r) => /가결/.test(r.PROC_RESULT_CD)).length;
  const recount = (r) => latest(r.plenary.rows, 'PROC_DT').rows.length;
  const cards = [
    { name: 'cover', facts: [{ computed: true, label: '처리 건수', value: count, recompute: recount }],
      make: (o) => cover({ ...o, series, dateLabel: `${md(date)} 본회의`, title: '처리된 법률안', count, unit: '건', sub: sample ? '샘플 데이터 5건만 받은 미리보기' : `이 중 가결 ${passed}건` }) },
    ...items.map((b, i) => ({
      name: `vote-${i + 1}`,
      facts: ['BILL_NAME', 'PROC_RESULT_CD', 'YES_TCNT', 'NO_TCNT', 'BLANK_TCNT', 'VOTE_TCNT', 'MEMBER_TCNT', 'PROC_DT'].map((f) => fact('plenary', b.BILL_ID, f, b[f])),
      checks: [() => (b.YES_TCNT + b.NO_TCNT + b.BLANK_TCNT > b.VOTE_TCNT ? '찬성+반대+기권이 재석보다 큼' : ''),
        () => (b.VOTE_TCNT > b.MEMBER_TCNT ? '재석이 재적보다 큼' : '')],
      make: (o) => voteCard({ ...o, series, bill: b, index: i + 1, count }),
    })),
    { name: 'end', facts: [], make: (o) => endCard({ ...o, series, rest: count - items.length }) },
  ];
  const caption = [
    `${md(date)} 본회의에서 처리된 법률안 ${count}건${sample ? ' (샘플 미리보기)' : ''}`,
    '',
    ...items.map((b, i) => `${i + 1}. ${b.BILL_NAME} — ${b.PROC_RESULT_CD} (찬성 ${b.YES_TCNT} · 반대 ${b.NO_TCNT} · 기권 ${b.BLANK_TCNT})`),
    ...(count > items.length ? [`외 ${count - items.length}건`] : []),
    '',
    `표결 기록은 프로필 링크(${SITE})에서 볼 수 있습니다.`,
    `자료: 열린국회정보(open.assembly.go.kr), ${date} 기준. 공개 자료를 그대로 옮겼으며 평가나 의견은 담지 않습니다.`,
    '',
    '#국회 #본회의 #표결',
  ].join('\n');
  return finish({ id: `plenary-${date}`, date, series, cards, caption }, sample);
}
