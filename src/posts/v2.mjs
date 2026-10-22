// v2 게시물(테스트): 같은 데이터·같은 검증, 표지 후킹 문구와 디자인·캡션만 다르다.
// 후킹 문구도 템플릿 + 데이터(순위, 타수 차이, 가격 차이)로만 만든다 — 숫자는 checks 에서 원본으로 다시 계산해 대조.
import { brand, displayName, isKorean, koName, md, posLabel, usd, won, daysBetween } from '../util.mjs';
import { country, roundsText } from '../cards/tour.mjs';
import { photoFor, compareCoverV2, endV2, koreansV2, leaderboardV2, productV2, scorecardV2, tipV2, tipsCoverV2, tourCoverV2 } from '../cards/v2.mjs';
import { DISCLOSURE, splitTip, tipText } from '../cards/gear.mjs';
import { LEAGUES } from '../espn.mjs';
import { freshItems } from './gear.mjs';
import { finish } from './common.mjs';

const posNum = (p) => parseInt(String(p.pos).replace(/^T/, ''), 10);
const toParText = (n) => (n === 0 ? 'E' : n > 0 ? `+${n}` : String(n));

// 대회 결과 → 표지 이야기(데이터만으로)
function tourHook(winner, bestKo, koTop10) {
  const w = displayName(winner);
  if (!bestKo) return { line1: w, line2: '우승', hl: '우승', facts: [] };
  const k = displayName(bestKo);
  const n = posNum(bestKo);
  const gap = bestKo.toPar - winner.toPar;
  if (n === 1) return { line1: `${k},`, line2: '정상에 섰다', hl: '정상', gap };
  if (n === 2) return { line1: `${k},`, line2: `${gap}타 차 준우승`, hl: `${gap}타 차`, gap };
  if (n <= 10) return { line1: `${k},`, line2: `${posLabel(bestKo.pos)}로 마무리`, hl: posLabel(bestKo.pos), gap };
  return { line1: `${w} 우승`, line2: `한국 최고 ${k}`, hl: k, gap };
}

export function tourPostV2(ev, src) {
  if (!ev || ev.state !== 'post') return null;
  const leagueName = LEAGUES[ev.league];
  const e = { ...ev, leagueName };
  const fin = ev.players.filter((p) => p.status === 'STATUS_FINISH' && Number.isFinite(posNum(p)));
  const winner = fin.find((p) => posNum(p) === 1);
  if (!winner) return null;
  const top10 = fin.filter((p) => posNum(p) <= 10);
  let top = top10, tail = null;
  if (top10.length > 10) {
    const lastPos = posNum(top10[9]);
    top = top10.filter((p) => posNum(p) < lastPos).slice(0, 9);
    const group = top10.filter((p) => posNum(p) === lastPos);
    tail = { pos: group[0].pos, toParText: group[0].toParText, players: group.map((p) => ({ ...p, display: displayName(p) })) };
  }
  const koreans = ev.players.filter(isKorean).sort((a, b) => (posNum(a) || 999) - (posNum(b) || 999));
  const bestKo = koreans.find((p) => fin.includes(p));
  const koTop10 = koreans.filter((p) => top10.includes(p)).length;
  const hook = tourHook(winner, bestKo, koTop10);
  const date = ev.end.slice(0, 10);
  const series = `${leagueName} 결과`;
  const P = (p, field, value, extra = {}) => ({ src, path: ['players', { id: p.id }, field], value, ...extra });
  const hero = bestKo || winner;
  const nameCell = (p) => (koName(p) ? `<b>${koName(p)}</b><span class="en">${p.name}</span>` : p.name);

  const koParts = [];
  for (let i = 0; i < koreans.length; i += 8) koParts.push(koreans.slice(i, i + 8));

  const cards = [
    { name: 'cover', make: (o) => tourCoverV2(o, e, {
        kicker: `${ev.league.toUpperCase()} · ${ev.name} · 최종`, line1: hook.line1, line2: hook.line2, hl: hook.hl,
        bigNum: hero.toParText, bigLabel: `${displayName(hero)} 최종 합계`,
        stats: [{ label: '우승', value: `${displayName(winner)} ${winner.toParText}` }, { label: '한국 선수 TOP 10', value: `${koTop10}명` }], photo: photoFor({ tourId: ev.id }) }),
      facts: [P(hero, 'toParText', hero.toParText), P(winner, 'toParText', winner.toParText), P(winner, 'name', winner.name, { shown: !koName(winner) }), { src, path: ['name'], value: ev.name }] },
    { name: 'scorecard', make: (o) => scorecardV2(o, e, hero, displayName(hero), ev.course?.par, posLabel(hero.pos)),
      facts: [P(hero, 'total', hero.total), P(hero, 'pos', posLabel(hero.pos), { expect: posLabel }),
        ...hero.rounds.map((r, i) => (r ? P(hero, 'rounds', r, { expect: (rs) => rs[i] }) : null)).filter(Boolean)] },
    { name: 'leaderboard', make: (o) => leaderboardV2(o, e, top, tail, { nameCell, country }),
      facts: [...top.flatMap((p) => [P(p, 'pos', p.pos), P(p, 'name', p.name), P(p, 'toParText', p.toParText)]),
        ...(tail ? tail.players.flatMap((p) => [P(p, 'pos', p.pos), P(p, 'toParText', p.toParText)]) : [])] },
    ...koParts.map((rows, i) => ({
      name: `koreans-${i + 1}`, make: (o) => koreansV2(o, e, rows, koParts.length > 1 ? `${i + 1}/${koParts.length}` : '', { display: displayName, roundsText, usd }),
      facts: rows.flatMap((p) => [P(p, 'toParText', p.toParText), P(p, 'rounds', roundsText(p), { expect: (r) => r.filter(Boolean).join('·') }),
        ...(p.status === 'STATUS_FINISH' ? [P(p, 'pos', p.pos)] : []),
        ...(p.status === 'STATUS_FINISH' && p.earnings ? [P(p, 'earnings', usd(p.earnings), { expect: (v) => usd(v) })] : [])]),
    })),
    { name: 'end', make: (o) => endV2({ ...o }, { source: 'ESPN', title: '다음 대회 때<br>다시 비교해 보세요',
      sub: `저장해 두면 한국 선수 성적을<br>대회마다 한눈에 볼 수 있어요.${ev.next ? `<br>다음 대회: ${ev.next.name} (${md(ev.next.start)} 시작)` : ''}` }), facts: [] },
  ];

  // 후킹 문구 숫자(타수 차, TOP10 인원)를 원본으로 다시 계산해 대조
  const checks = [(load) => {
    const raw = load(src);
    const f = raw.players.filter((x) => x.status === 'STATUS_FINISH' && Number.isFinite(posNum(x)));
    const w = f.find((x) => posNum(x) === 1);
    const ko = raw.players.filter((x) => x.country === 'South Korea');
    const b = ko.filter((x) => f.includes(x)).sort((a, c) => posNum(a) - posNum(c))[0];
    if (hook.gap !== undefined && b && b.toPar - w.toPar !== hook.gap) return `표지 타수 차 ${hook.gap} ≠ 원본 ${b.toPar - w.toPar}`;
    const n10 = ko.filter((x) => f.includes(x) && posNum(x) <= 10).length;
    if (n10 !== koTop10) return `표지 한국 TOP10 ${koTop10}명 ≠ 원본 ${n10}명`;
    if (ev.course?.par) for (const [i, r] of hero.rounds.entries()) if (r && raw.course.par !== ev.course.par) return `파 정보 불일치(R${i + 1})`;
    return '';
  }];

  const tags = ['#골프', `#${ev.league.toUpperCase()}`, '#골프스타그램', '#골프대회', ...[...new Set(koreans.filter((p) => fin.includes(p) && koName(p)).slice(0, 4).map((p) => `#${koName(p)}`))]];
  const caption = [
    `${hook.line1.replace(/,$/, '')} ${hook.line2} | ${leagueName} ${ev.name}`,
    '',
    `🏆 우승 ${displayName(winner)} ${winner.toParText}${winner.country ? ` (${country(winner.country)})` : ''}`,
    bestKo ? `🇰🇷 한국 최고 ${displayName(bestKo)} ${posLabel(bestKo.pos)} ${bestKo.toParText}` : '',
    '',
    ...(koreans.length ? ['한국 선수 성적', ...koreans.map((p) => `${p.status === 'STATUS_FINISH' ? posLabel(p.pos) : '—'} ${displayName(p)} ${p.toParText}`)] : []),
    '',
    '👉 다음 대회 우승은 누구일까요? 댓글로 예상해 주세요',
    '📌 저장해 두면 대회마다 한국 선수 성적을 비교할 수 있어요',
    `🏌️ 클럽 비교·쿠팡 가격은 프로필 링크(${brand.site})`,
    '',
    `기록 출처: ESPN, ${date} 기준`,
    '',
    tags.join(' '),
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  return finish({ id: `tour-${ev.league}-${ev.id}`, kind: 'tour', date, series, cards, checks, caption, warnings: [] });
}

export function comparePostV2(gear, catId, date, src = 'gear') {
  const cat = gear.categories.find((c) => c.id === catId);
  const all = freshItems(gear, catId, date).sort((a, b) => a.pick.price - b.pick.price);
  if (!cat || all.length < 3) return null;
  const items = all.length <= 6 ? all : Array.from({ length: 6 }, (_, i) => all[Math.round((i * (all.length - 1)) / 5)]);
  const low = items[0], high = items.at(-1);
  const gap = high.pick.price - low.pick.price;
  const gapMan = Math.floor(gap / 10000);
  const checked = items.map((p) => p.pick.checked).sort().at(-1);
  const series = `${cat.name} 가격 비교`;
  const F = (p, path, value, extra = {}) => ({ src, path: ['products', { id: p.id }, ...path], value, ...extra });
  const cards = [
    { name: 'cover', make: (o) => compareCoverV2(o, { kicker: `${cat.name} ${items.length}종 · 쿠팡 판매가`, line1: `${cat.name} 가격,`,
        line2: `최대 ${gapMan}만원 차이`, hl: `${gapMan}만원`, low: won(low.pick.price), high: won(high.pick.price), checkedText: `${md(checked)} 확인 가격 · 옵션·시기에 따라 다를 수 있음`, photo: photoFor({ category: catId }) }),
      facts: [F(low, ['pick', 'price'], won(low.pick.price), { expect: won }), F(high, ['pick', 'price'], won(high.pick.price), { expect: won })] },
    ...items.map((p, i) => ({ name: `item-${i + 1}`, make: (o) => productV2(o, { index: i + 1, count: items.length, name: p.name, price: won(p.pick.price), rocket: p.pick.rocket,
        checkedText: `${md(p.pick.checked)} 쿠팡 판매가`, summary: p.summary, points: p.points.slice(0, 2), rankLabel: i === 0 ? '가장 싼 모델' : i === items.length - 1 ? '가장 비싼 모델' : '' }),
      facts: [F(p, ['name'], p.name), F(p, ['pick', 'price'], won(p.pick.price), { expect: won }), F(p, ['pick', 'checked'], md(p.pick.checked), { expect: md }), F(p, ['summary'], p.summary)] })),
    { name: 'end', make: (o) => endV2(o, { source: '쿠팡 판매가(초이스골프 확인)', title: '살 때 다시<br>꺼내 보세요',
      sub: '저장해 두면 매장·온라인 가격을<br>바로 비교할 수 있어요.<br>모델별 자세한 비교는 프로필 링크에서.', disclosure: DISCLOSURE }), facts: [] },
  ];
  const checks = [(load) => {
    const g = load(src);
    const lo = g.products.find((x) => x.id === low.id).pick.price, hi = g.products.find((x) => x.id === high.id).pick.price;
    if (Math.floor((hi - lo) / 10000) !== gapMan) return `표지 가격 차이 ${gapMan}만원 ≠ 원본 ${Math.floor((hi - lo) / 10000)}만원`;
    for (const it of items) {
      const p = g.products.find((x) => x.id === it.id);
      if ((p.min && p.pick.price < p.min) || (p.max && p.pick.price > p.max)) return `${p.name}: 가격이 정상 범위를 벗어남`;
      const age = daysBetween(p.pick.checked, date);
      if (age < 0 || age > brand.staleDays) return `${p.name}: 확인일 ${p.pick.checked} 기준 초과`;
    }
    return '';
  }];
  const caption = [
    `🔗 모델 비교·쿠팡 가격은 프로필 링크(${brand.site})`,
    `${cat.name} 가격, 최대 ${gapMan}만원 차이 💸 인기 ${items.length}종 쿠팡 판매가 (${md(checked)} 확인)`,
    '',
    ...items.map((p, i) => `${i + 1}. ${p.name} ${won(p.pick.price)}${p.pick.rocket ? ' 🚀로켓' : ''}`),
    '',
    '👉 지금 쓰는 모델은 몇 번인가요? 댓글로 알려 주세요',
    '📌 저장해 두고 살 때 다시 보세요',
    `🏌️ 모델별 비교·오늘 가격은 프로필 링크(${brand.site})`,
    '',
    '가격은 확인한 날짜 기준이며 옵션(로프트·샤프트 등)과 시기에 따라 달라질 수 있습니다.',
    DISCLOSURE,
    '',
    ['#골프', '#골프용품', '#골프스타그램', '#골프클럽', `#${cat.name}`, `#${cat.name}추천`].join(' '),
  ].join('\n');
  return finish({ id: `compare-${catId}-${date}`, kind: 'compare', category: catId, date, series, cards, checks, caption, warnings: [] });
}

export function tipsPostV2(gear, catId, date, src = 'gear') {
  const cat = gear.categories.find((c) => c.id === catId);
  if (!cat || cat.tips.length < 3) return null;
  const tips = cat.tips.slice(0, 8);
  const C = (path, value, extra = {}) => ({ src, path: ['categories', { id: catId }, ...path], value, ...extra });
  const cards = [
    { name: 'cover', make: (o) => tipsCoverV2(o, { name: cat.name, intro: cat.intro, count: tips.length, photo: photoFor({ category: catId }) }), facts: [C(['intro'], cat.intro)] },
    ...tips.map((t, i) => {
      const s = splitTip(t);
      return { name: `tip-${i + 1}`, make: (o) => tipV2(o, { name: cat.name, index: i + 1, count: tips.length, head: s?.head, body: s?.body, text: t }),
        facts: [C(['tips', i], tipText(t), { expect: tipText })] };
    }),
    { name: 'end', make: (o) => endV2(o, { source: '초이스골프', title: '살 때 꺼내 보는<br>체크리스트',
      sub: `저장해 두면 ${cat.name} 고를 때<br>바로 확인할 수 있어요.<br>모델별 비교·쿠팡 가격은 프로필 링크에서.`, disclosure: DISCLOSURE }), facts: [] },
  ];
  const caption = [
    `🔗 모델 비교·쿠팡 가격은 프로필 링크(${brand.site})`,
    `${cat.name}, 이것만 보고 고르세요 ✅ ${tips.length}가지 기준`,
    '',
    cat.intro,
    '',
    ...tips.map((t, i) => `${i + 1}. ${t}`),
    '',
    '👉 여러분은 무엇을 가장 먼저 보나요? 댓글로 알려 주세요',
    '📌 저장해 두고 살 때 다시 보세요',
    `🏌️ ${cat.name} 모델별 비교·쿠팡 가격은 프로필 링크(${brand.site})`,
    '',
    DISCLOSURE,
    '',
    ['#골프', '#골프초보', '#골프스타그램', '#골프용품', `#${cat.name}`, `#${cat.name}고르는법`].join(' '),
  ].join('\n');
  return finish({ id: `tips-${catId}`, kind: 'tips', category: catId, date, series: `${cat.name} 고르는 법`, cards, checks: [], caption, warnings: [] });
}
