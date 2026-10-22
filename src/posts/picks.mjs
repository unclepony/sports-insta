// 실력별 추천(v2): golf-price 가이드(사이트에 공개한 글)의 실력 단계별 추천 모델.
// 글은 가이드에 쓴 그대로(역할·이런 분께·장단점·한 줄 평), 가격은 확인일 14일 이내일 때만.
import { brand, daysBetween, md, won } from '../util.mjs';
import { endV2, photoFor, pickCoverV2, pickItemV2 } from '../cards/v2.mjs';
import { DISCLOSURE } from '../cards/gear.mjs';
import { finish } from './common.mjs';

export const SKILLS = { 초심자: ['초보', 'beginner'], 중급: ['중급', 'intermediate'], 고급: ['고급', 'advanced'], 프로: ['상급·프로', 'pro'] };
const MAX = 6;

// 가이드 × 실력 단계마다 게시물 하나(실력 구분 없는 작은 가이드는 하나)
export function pickTargets(gear) {
  const out = [];
  for (const g of gear.guides || []) {
    // 실력 단계마다 3개 이상이면 단계별로, 아니면(작은 가이드) 전체를 하나로
    const skills = Object.keys(SKILLS).filter((s) => g.picks.filter((p) => p.skill === s).length >= 3);
    if (skills.length) for (const s of skills) out.push({ slug: g.slug, skill: s });
    else if (g.picks.length >= 3) out.push({ slug: g.slug, skill: null });
  }
  return out;
}

export function pickPost(gear, { slug, skill }, date, src = 'gear') {
  const g = gear.guides?.find((x) => x.slug === slug);
  if (!g) return null;
  const prod = (id) => gear.products.find((p) => p.id === id);
  const picks = g.picks.filter((p) => (skill ? p.skill === skill : true) && prod(p.id) && p.verdict && p.forWhom).slice(0, MAX);
  if (picks.length < 3) return null;
  const cat = gear.categories.find((c) => c.id === prod(picks[0].id).category);
  if (!cat) return null;
  const gender = g.gender && g.gender !== '공용' ? `${g.gender} ` : '';
  const level = skill ? SKILLS[skill][0] : '';
  const fresh = (p) => p?.pick?.price && p.pick.checked && daysBetween(p.pick.checked, date) >= 0 && daysBetween(p.pick.checked, date) <= brand.staleDays;
  const G = (i, field, value, extra = {}) => ({ src, path: ['guides', { slug }, 'picks', { id: picks[i].id }, field], value, ...extra });
  const P = (id, path, value, extra = {}) => ({ src, path: ['products', { id }, ...path], value, ...extra });
  const series = `${level ? `${level} ` : ''}${gender}${cat.name} 추천`;
  const line1 = `${level ? `${level} ` : ''}${gender}${cat.name},`;
  const cards = [
    { name: 'cover', make: (o) => pickCoverV2(o, { kicker: `${gender}${cat.name} · 실력별 추천`, line1, line2: `이 ${picks.length}개 중에 고르세요`, hl: `${picks.length}개`,
        names: picks.map((p) => prod(p.id).name), photo: photoFor({ category: cat.id }) }),
      facts: picks.map((p) => P(p.id, ['name'], prod(p.id).name)) },
    ...picks.map((p, i) => {
      const pr = prod(p.id);
      const priceText = fresh(pr) ? `${md(pr.pick.checked)} 쿠팡 판매가 ${won(pr.pick.price)}${pr.pick.rocket ? ' · 로켓배송' : ''} · 옵션·시기에 따라 다를 수 있음` : '';
      return { name: `pick-${i + 1}`, make: (o) => pickItemV2(o, { index: i + 1, count: picks.length, role: p.role, name: pr.name, forWhom: p.forWhom,
          pros: p.pros.slice(0, 2), cons: p.cons.slice(0, 2), verdict: p.verdict, priceText }),
        facts: [P(p.id, ['name'], pr.name), G(i, 'forWhom', p.forWhom), G(i, 'verdict', p.verdict),
          ...(p.role ? [G(i, 'role', p.role)] : []),
          ...p.pros.slice(0, 2).map((t, k) => G(i, 'pros', t, { expect: (a) => a[k] })),
          ...p.cons.slice(0, 2).map((t, k) => G(i, 'cons', t, { expect: (a) => a[k] })),
          ...(priceText ? [P(p.id, ['pick', 'price'], won(pr.pick.price), { expect: won })] : [])] };
    }),
    { name: 'end', make: (o) => endV2(o, { source: 'ATL골프기어 가이드', title: '내 실력에 맞는<br>클럽부터',
      sub: `저장해 두고 살 때 다시 보세요.<br>${cat.name} 실력별 전체 비교·점수는<br>프로필 링크의 가이드에서.`, disclosure: DISCLOSURE }), facts: [] },
  ];
  const checks = [(load) => {
    const gg = load(src);
    for (const p of picks) {
      const pr = gg.products.find((x) => x.id === p.id);
      if (fresh(pr) && ((pr.min && pr.pick.price < pr.min) || (pr.max && pr.pick.price > pr.max))) return `${pr.name}: 가격이 정상 범위를 벗어남`;
    }
    return '';
  }];
  const caption = [
    `🔗 모델 비교·쿠팡 가격은 프로필 링크(${brand.site})`,
    `${line1.replace(/,$/, '')}, 이 ${picks.length}개 중에 고르세요 ⛳`,
    '',
    ...picks.map((p, i) => `${i + 1}. ${prod(p.id).name}${p.role ? ` (${p.role})` : ''} — ${p.forWhom}`),
    '',
    '👉 지금 쓰는 클럽은 몇 번에 가까운가요? 댓글로 알려 주세요',
    '📌 저장해 두고 살 때 다시 보세요',
    `🏌️ 실력별 전체 비교·쿠팡 가격은 프로필 링크(${brand.site})`,
    '',
    'ATL골프기어 가이드의 평가를 옮겼습니다. 가격은 확인한 날짜 기준이며 달라질 수 있습니다.',
    DISCLOSURE,
    '',
    ['#골프', '#골프스타그램', '#골프용품', `#${cat.name}`, `#${cat.name}추천`, ...(level === '초보' ? ['#골프초보'] : [])].join(' '),
  ].join('\n');
  return finish({ id: `pick-${slug}${skill ? `-${SKILLS[skill][1]}` : ''}`, kind: 'pick', category: cat.id, date, series, cards, checks, caption, warnings: [] });
}
