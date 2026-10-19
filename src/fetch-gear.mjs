// golf-price 의 용품 정보·쿠팡 확인가를 그날 원본으로 복사: data/raw/<날짜>/gear.json
// golf-price 저장소 위치: GOLF_PRICE_DIR (기본: 옆 폴더 ../golf-price)
// 쿠팡 페이지를 직접 긁지 않는다 — golf-price 가 파트너스 사이트에서 확인해 둔 값만 쓴다.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ROOT, readJson, today } from './util.mjs';

const gpDir = resolve(process.env.GOLF_PRICE_DIR || fileURLToPath(new URL('../golf-price', ROOT)));
const gp = (f) => readJson(pathToFileURL(resolve(gpDir, 'config', f)));

const products = gp('products.json');
const picks = gp('picks.json');

const out = {
  fetchedAt: new Date().toISOString(),
  source: 'golf-price config (products.json, picks.json)',
  categories: products.categories.map((c) => ({ id: c.id, name: c.name, intro: c.intro, tips: c.tips || [] })),
  products: products.products.map((p) => ({
    id: p.id, category: p.category, name: p.name, summary: p.summary, points: p.points || [],
    min: p.min, max: p.max,
    pick: picks[p.id] ? { title: picks[p.id].title, price: picks[p.id].price, rocket: !!picks[p.id].rocket, checked: picks[p.id].checked } : null,
  })),
  // 실력별 추천 가이드(사이트에 이미 공개한 글): 실력별 추천 시리즈에 쓴다
  guides: gp('guides.json').guides.map((g) => ({
    slug: g.slug, title: g.title, gender: g.gender, updated: g.updated, criteria: g.criteria || [],
    faq: (g.faq || []).map((x) => ({ q: x.q, a: x.a })), // 스레드 초보 Q&A 글감
    picks: (g.picks || []).map((p) => ({ id: p.id, skill: p.skill || null, role: p.role, forWhom: p.forWhom, pros: p.pros || [], cons: p.cons || [], verdict: p.verdict, scores: p.scores || [] })),
  })),
};

const dir = new URL(`data/raw/${today()}/`, ROOT);
await mkdir(dir, { recursive: true });
await writeFile(new URL('gear.json', dir), JSON.stringify(out, null, 1));
console.log(`gear: 분류 ${out.categories.length}, 상품 ${out.products.length} (확인가 있음 ${out.products.filter((p) => p.pick?.price).length})`);
