// 용품 게시물: 분류별 쿠팡 판매가 비교, 고르는 법. 글은 golf-price 에 이미 쓴 소개·팁을 그대로 쓴다.
import { brand, daysBetween, md, won } from '../util.mjs';
import { DISCLOSURE, SOURCE, TIP_SOURCE, compareCover, gearEnd, productCard, tipCard, tipText, tipsCover } from '../cards/gear.mjs';
import { finish } from './common.mjs';

const MAX_ITEMS = 6;
const TAGS = { driver: '#드라이버', wood: '#우드', utility: '#유틸리티', iron: '#아이언', wedge: '#웨지', putter: '#퍼터', ball: '#골프공',
  rangefinder: '#거리측정기', shoes: '#골프화', gps: '#골프GPS', launch: '#론치모니터', bag: '#골프백', glove: '#골프장갑', practice: '#골프연습' };

// 확인가가 있고 오래되지 않은(staleDays) 상품만
export function freshItems(gear, catId, date) {
  return gear.products.filter((p) => p.category === catId && p.pick?.price && p.pick.checked
    && daysBetween(p.pick.checked, date) >= 0 && daysBetween(p.pick.checked, date) <= brand.staleDays);
}

// 가격순으로 줄 세운 뒤 고르게 MAX_ITEMS 개(싼 것만·비싼 것만 몰리지 않게)
function spread(items) {
  const s = [...items].sort((a, b) => a.pick.price - b.pick.price);
  if (s.length <= MAX_ITEMS) return s;
  return Array.from({ length: MAX_ITEMS }, (_, i) => s[Math.round((i * (s.length - 1)) / (MAX_ITEMS - 1))]);
}

export function comparePost(gear, catId, date, src = 'gear') {
  const cat = gear.categories.find((c) => c.id === catId);
  const items = spread(freshItems(gear, catId, date));
  if (!cat || items.length < 3) return null;
  const checked = items.map((p) => p.pick.checked).sort().at(-1);
  const series = `${cat.name} 가격 비교`;
  const F = (p, path, value, extra = {}) => ({ src, path: ['products', { id: p.id }, ...path], value, ...extra });
  const cards = [
    { name: 'cover', make: (o) => compareCover(o, cat, items, checked),
      facts: [F(items[0], ['pick', 'price'], won(items[0].pick.price), { expect: won }), F(items.at(-1), ['pick', 'price'], won(items.at(-1).pick.price), { expect: won })] },
    ...items.map((p, i) => ({
      name: `item-${i + 1}`, make: (o) => productCard(o, cat, p, i + 1, items.length),
      facts: [F(p, ['name'], p.name), F(p, ['pick', 'price'], won(p.pick.price), { expect: won }), F(p, ['pick', 'checked'], md(p.pick.checked), { expect: md }),
        F(p, ['summary'], p.summary), ...p.points.slice(0, 2).map((t, k) => F(p, ['points', k], t))],
    })),
    { name: 'end', make: (o) => gearEnd(o), facts: [] },
  ];
  const checks = [(load) => {
    const g = load(src);
    for (const it of items) {
      const p = g.products.find((x) => x.id === it.id);
      if (p.min && p.pick.price < p.min) return `${p.name}: 가격 ${p.pick.price} 가 정상 범위 최저 ${p.min} 보다 낮음(옵션 착오 가능)`;
      if (p.max && p.pick.price > p.max) return `${p.name}: 가격 ${p.pick.price} 가 정상 범위 최고 ${p.max} 보다 높음`;
      const age = daysBetween(p.pick.checked, date);
      if (age < 0 || age > brand.staleDays) return `${p.name}: 확인일 ${p.pick.checked} 가 ${brand.staleDays}일 기준을 벗어남`;
    }
    return '';
  }];
  const caption = [
    `인기 ${cat.name} ${items.length}종 쿠팡 판매가 비교 (${md(checked)} 확인, 낮은 가격순)`,
    '',
    ...items.map((p, i) => `${i + 1}. ${p.name} — ${won(p.pick.price)}${p.pick.rocket ? ' (로켓배송)' : ''}`),
    '',
    '가격은 확인한 날짜 기준이며 옵션(로프트·샤프트 등)과 시기에 따라 달라질 수 있습니다.',
    `모델별 자세한 비교와 오늘 가격은 프로필 링크(${brand.site})에서 확인하세요.`,
    '',
    DISCLOSURE,
    '',
    ['#골프', '#골프용품', '#골프클럽', TAGS[catId], `#${cat.name}추천`].filter(Boolean).join(' '),
  ].join('\n');
  return finish({ id: `compare-${catId}-${date}`, kind: 'compare', category: catId, date, series, cards, checks, caption, warnings: [] });
}

export function tipsPost(gear, catId, date, src = 'gear') {
  const cat = gear.categories.find((c) => c.id === catId);
  if (!cat || cat.tips.length < 3) return null;
  const tips = cat.tips.slice(0, 8);
  const series = `${cat.name} 고르는 법`;
  const C = (path, value) => ({ src, path: ['categories', { id: catId }, ...path], value });
  const cards = [
    { name: 'cover', source: TIP_SOURCE, make: (o) => tipsCover(o, cat, tips.length), facts: [C(['intro'], cat.intro)] },
    ...tips.map((t, i) => ({ name: `tip-${i + 1}`, make: (o) => tipCard(o, cat, t, i + 1, tips.length), facts: [{ ...C(['tips', i], tipText(t)), expect: tipText }] })),
    { name: 'end', make: (o) => gearEnd({ ...o, source: TIP_SOURCE }, { disclosure: true }), facts: [] },
  ];
  const caption = [
    `${cat.name}, 이것만 보고 고르세요 — ${tips.length}가지 기준`,
    '',
    cat.intro,
    '',
    ...tips.map((t, i) => `${i + 1}. ${t}`),
    '',
    `${cat.name} 모델별 비교와 쿠팡 가격은 프로필 링크(${brand.site})에서 볼 수 있습니다.`,
    '',
    DISCLOSURE,
    '',
    ['#골프', '#골프초보', '#골프용품', TAGS[catId], `#${cat.name}고르는법`].filter(Boolean).join(' '),
  ].join('\n');
  return finish({ id: `tips-${catId}`, kind: 'tips', category: catId, date, series, cards, checks: [], caption, warnings: [] });
}

export { SOURCE };
