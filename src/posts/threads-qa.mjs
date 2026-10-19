// 스레드 초보 Q&A 게시물: golf-price 가이드 FAQ(사이트에 공개한 글)의 질문·답을 그대로 쓰고,
// 스레드 말투의 틀(여러 개를 돌아가며)로 감싼 뒤 끝에 해당 가이드 링크(utm 포함)를 붙인다. 숫자·사실은 새로 만들지 않는다.
// 순서: naver-blog keywords.json 의 키워드 순서(검색 수요가 큰 주제 먼저) → 나머지 가이드.
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ROOT, brand, readJson } from '../util.mjs';
import { photoFor, qaCardV2 } from '../cards/v2.mjs';
import { finish } from './common.mjs';

export const TH_MAX_CHARS = 500;
const SITE = `https://${brand.site}`;

// 키워드 순서(없으면 가이드 순서 그대로)
function guideOrder(gear) {
  const f = resolve(process.env.NAVER_BLOG_DIR || fileURLToPath(new URL('../naver-blog', ROOT)), 'keywords.json');
  const order = [];
  if (existsSync(f)) { for (const k of readJson(pathToFileURL(f)).items || []) for (const g of k.guide || []) if (!order.includes(g)) order.push(g); }
  else { const c = new URL('config/threads-order.json', ROOT); if (existsSync(c)) for (const g of readJson(c).order || []) if (!order.includes(g)) order.push(g); }
  for (const g of gear.guides) if (!order.includes(g.slug)) order.push(g.slug);
  return order;
}

// 스레드 말투 틀 — 같은 문장만 반복되지 않게 돌아가며 쓴다(질문·답·링크만 채움)
const TEMPLATES = [
  ({ q, a, url }) => `골린이 질문 하나 🙋\n${q}\n\n${a}\n\n실력별로 더 비교해 둔 거 👉 ${url}`,
  ({ q, a, url, topic }) => `${q}\n\n짧게 답하면 → ${a}\n\n${topic} 모델별 정리는 여기 ${url}`,
  ({ q, a, url }) => `은근 많이 물어보는 거.\n"${q}"\n\n${a}\n\n자세한 건 👇\n${url}`,
  ({ q, a, url, topic }) => `[${topic} 고를 때]\nQ. ${q}\nA. ${a}\n\n저장해 두고 살 때 보세요 ⛳ ${url}`,
];
const NOTE = '※ 링크 페이지의 쿠팡 링크로 구매하면 수수료를 받을 수 있어요';

export function qaItems(gear) {
  const items = [];
  for (const slug of guideOrder(gear)) {
    const g = gear.guides.find((x) => x.slug === slug);
    if (!g) continue;
    (g.faq || []).forEach((f, i) => items.push({ slug, i, q: f.q, a: f.a, guide: g }));
  }
  // 같은 가이드가 연달아 나오지 않게 가이드끼리 번갈아 섞는다(라운드 로빈)
  const by = new Map();
  for (const it of items) { if (!by.has(it.slug)) by.set(it.slug, []); by.get(it.slug).push(it); }
  const out = [];
  for (let r = 0; out.length < items.length; r++) for (const list of by.values()) if (list[r]) out.push(list[r]);
  return out;
}

export function threadsPost(gear, item, date, n, src = 'gear') {
  const { slug, i, q, a, guide } = item;
  const firstPick = guide.picks.map((p) => gear.products.find((x) => x.id === p.id)).find(Boolean);
  const cat = firstPick ? gear.categories.find((c) => c.id === firstPick.category) : null;
  const topic = `${guide.gender && guide.gender !== '공용' ? `${guide.gender} ` : ''}${cat?.name || '골프용품'}`;
  const id = `th-${slug}-${i}`;
  const url = `${SITE}/g/${slug}?utm_source=threads&utm_medium=post&utm_campaign=${id}`;
  const text = `${TEMPLATES[n % TEMPLATES.length]({ q, a, url, topic })}\n\n${NOTE}`;
  const F = (field, value) => ({ src, path: ['guides', { slug }, 'faq', i, field], value });
  const cards = [{ name: 'qa', make: (o) => qaCardV2(o, { topic, q, a, photo: photoFor({ category: cat?.id }) }), facts: [F('q', q), F('a', a)] }];
  const checks = [() => {
    if ([...text].length > TH_MAX_CHARS) return `스레드 글 ${[...text].length}자 — 500자 초과`;
    if (!text.includes(q) || !text.includes(a)) return '글에 질문·답 원문이 그대로 들어가지 않음';
    if ((text.match(/https?:\/\//g) || []).length > 1) return '링크가 2개 이상';
    return '';
  }];
  const post = finish({ id, kind: 'threads-qa', category: cat?.id || null, date, series: `골린이 Q&A · ${topic}`, cards, checks, caption: text, warnings: [] });
  post.single = true; // 한 장짜리(캐러셀 아님)
  post.text = text;
  post.url = url;
  return post;
}
