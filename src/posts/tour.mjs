// 투어 최종 결과 게시물. 문장은 템플릿만 쓴다(AI 문장 생성 없음).
import { brand, displayName, isKorean, koName, md, usd } from '../util.mjs';
import { country, koreansCard, leaderboardCard, roundsText, tourCover, tourEnd } from '../cards/tour.mjs';
import { LEAGUES } from '../espn.mjs';
import { finish } from './common.mjs';

const KO_PER_CARD = 8;
const TOP_ROWS = 10;
const posNum = (p) => parseInt(String(p.pos).replace(/^T/, ''), 10);

export function tourPost(ev, src) {
  if (!ev || ev.state !== 'post') return null;
  const leagueName = LEAGUES[ev.league];
  const e = { ...ev, leagueName };
  const fin = ev.players.filter((p) => p.status === 'STATUS_FINISH' && Number.isFinite(posNum(p)));
  const winner = fin.find((p) => posNum(p) === 1);
  if (!winner) return null;
  // TOP 10: 공동 순위 묶음이 10줄을 넘기면 마지막 묶음은 한 줄로 줄여 보여 준다
  const top10 = fin.filter((p) => posNum(p) <= 10);
  let top = top10, tail = null;
  if (top10.length > TOP_ROWS) {
    const lastPos = posNum(top10[TOP_ROWS - 1]);
    top = top10.filter((p) => posNum(p) < lastPos).slice(0, TOP_ROWS - 1);
    const group = top10.filter((p) => posNum(p) === lastPos);
    tail = { pos: group[0].pos, toParText: group[0].toParText, players: group };
    if (top.length + 1 > TOP_ROWS) { top = top.slice(0, TOP_ROWS); tail = null; }
  }
  const koreans = [...ev.players.filter(isKorean)].sort((a, b) => (posNum(a) || 999) - (posNum(b) || 999));
  const bestKo = koreans.find((p) => fin.includes(p));
  const series = `${leagueName} 결과`;
  const date = ev.end.slice(0, 10);

  const P = (p, field, value, extra = {}) => ({ src, path: ['players', { id: p.id }, field], value, ...extra });
  const nameFact = (p) => P(p, 'name', p.name, { shown: !koName(p) }); // 한글 이름이면 영문은 리더보드에만 작게
  const koParts = [];
  for (let i = 0; i < koreans.length; i += KO_PER_CARD) koParts.push(koreans.slice(i, i + KO_PER_CARD));

  const cards = [
    { name: 'cover', make: (o) => tourCover(o, e, { winner, bestKo }),
      facts: [P(winner, 'toParText', winner.toParText), nameFact(winner), { src, path: ['name'], value: ev.name },
        ...(bestKo ? [P(bestKo, 'pos', bestKo.pos), P(bestKo, 'toParText', bestKo.toParText)] : [])] },
    { name: 'leaderboard', make: (o) => leaderboardCard(o, e, top, tail),
      facts: [...top.flatMap((p) => [P(p, 'pos', p.pos), P(p, 'name', p.name), P(p, 'toParText', p.toParText), P(p, 'total', p.total)]),
        ...(tail ? tail.players.flatMap((p) => [P(p, 'pos', p.pos), P(p, 'toParText', p.toParText), ...(koName(p) ? [] : [P(p, 'name', p.name)])]) : [])] },
    ...koParts.map((rows, i) => ({
      name: `koreans-${i + 1}`, make: (o) => koreansCard(o, e, rows, koParts.length > 1 ? `${i + 1}/${koParts.length}` : ''),
      facts: rows.flatMap((p) => [P(p, 'toParText', p.toParText),
        P(p, 'rounds', roundsText(p), { expect: (r) => r.filter(Boolean).join('·') }),
        ...(p.status === 'STATUS_FINISH' ? [P(p, 'pos', p.pos)] : []),
        ...(p.status === 'STATUS_FINISH' && p.earnings ? [P(p, 'earnings', usd(p.earnings), { expect: (v) => usd(v) })] : [])]),
    })),
    { name: 'end', make: (o) => tourEnd(o, e), facts: [] },
  ];

  const checks = [
    // 타수 = 라운드 합, 합계(파 대비) = 타수 − 파×라운드 수 (단일 코스일 때)
    (load) => {
      const raw = load(src);
      for (const p of raw.players.filter((x) => x.status === 'STATUS_FINISH')) {
        const sum = p.rounds.reduce((a, b) => a + (b || 0), 0);
        if (sum !== p.total) return `${p.name}: 라운드 합 ${sum} ≠ 타수 ${p.total}`;
        if (raw.course?.par && p.total - raw.course.par * p.rounds.filter(Boolean).length !== p.toPar)
          return `${p.name}: 타수 ${p.total} − 파 ≠ 합계 ${p.toPar} (코스가 여러 개일 수 있음)`;
      }
      return '';
    },
    // 순위가 합계 순서와 맞는지(공동 순위·연장전 허용)
    (load) => {
      const f = load(src).players.filter((x) => x.status === 'STATUS_FINISH' && Number.isFinite(posNum(x)));
      for (const p of f) {
        const better = f.filter((q) => q.toPar < p.toPar).length;
        const same = f.filter((q) => q.toPar === p.toPar).length;
        if (posNum(p) < better + 1 || posNum(p) > better + same) return `${p.name}: 순위 ${p.pos} 가 합계 ${p.toParText} 와 맞지 않음`;
      }
      return '';
    },
  ];

  const koLine = bestKo ? `한국 선수 최고 성적은 ${displayName(bestKo)} ${bestKo.pos}위(${bestKo.toParText}).` : '';
  const tags = ['#골프', `#${ev.league.toUpperCase()}`, '#골프대회', ...[...new Set(koreans.filter((p) => fin.includes(p) && koName(p)).slice(0, 3).map((p) => `#${koName(p)}`))]];
  const caption = [
    `${leagueName} ${ev.name} 최종 결과 (${md(ev.start)}~${md(ev.end)})`,
    '',
    `우승: ${displayName(winner)} ${winner.toParText}${winner.country ? ` (${country(winner.country)})` : ''}`,
    koLine,
    '',
    ...(koreans.length ? ['한국 선수', ...koreans.map((p) => `${p.status === 'STATUS_FINISH' ? `${p.pos}위` : '—'} ${displayName(p)} ${p.toParText}`)] : []),
    '',
    `골프 클럽 비교·쿠팡 가격은 프로필 링크(${brand.site})에서 볼 수 있습니다.`,
    `기록 출처: ESPN, ${date} 기준.`,
    '',
    tags.join(' '),
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');

  const unknownKo = koreans.filter((p) => !koName(p)).map((p) => `${p.name} (ESPN ${p.id})`);
  return finish({ id: `tour-${ev.league}-${ev.id}`, kind: 'tour', date, series, cards, checks, caption, warnings: unknownKo.length ? [`한글 이름 추가 필요: ${unknownKo.join(', ')}`] : [] });
}
