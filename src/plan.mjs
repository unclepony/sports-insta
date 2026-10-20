// 오늘 올릴 게시물 고르기. 하루 최대 3번(아침·점심·저녁 슬롯), 실행할 때마다 하나.
//  1순위: 최근 4일 안에 끝난 투어 대회 결과(아직 안 올린 것)
//  그 밖: 종류를 돌아가며 — 실력별 추천(pick) → 가격 비교(compare) → 고르는 법(tips) → …
//         같은 게시물은 30일 안에 다시 올리지 않음, 같은 날 같은 분류는 피함
//  릴스: 화·목·토 저녁 슬롯만 캐러셀 대신 릴스(하루 1개)
import { readdirSync } from 'node:fs';
import { brand, daysBetween, readJson } from './util.mjs';
import { tourPost } from './posts/tour.mjs';
import { comparePost, tipsPost } from './posts/gear.mjs';
import { comparePostV2, tipsPostV2, tourPostV2 } from './posts/v2.mjs';
import { pickPost, pickTargets } from './posts/picks.mjs';

// 디자인: config/brand.json 의 theme ('v2' 기본, 'v1' 로 되돌리기 가능). 게시물 id 는 둘이 같아 중복 게시 방지가 그대로 작동한다.
const V2 = (brand.theme || 'v2') === 'v2';
const makeTour = V2 ? tourPostV2 : tourPost;
const makeGear = V2 ? [comparePostV2, tipsPostV2] : [comparePost, tipsPost];

export const GEAR_ORDER = ['driver', 'iron', 'putter', 'wedge', 'wood', 'utility', 'ball', 'shoes', 'rangefinder', 'bag', 'glove', 'gps', 'launch', 'practice'];
export const KIND_CYCLE = ['pick', 'compare', 'tips'];
export const DAILY_MAX = 4; // 인스타 API 한도(24시간 100개)보다 훨씬 적게 — 스팸·도달 저하 방지 (2026-10-19 3→4, 22시 릴스 실험)
const REEL_DAYS = [2, 4, 6]; // 화 목 토 (0=일)
const REELS_FIRST = true; // 2026-10-21 실험: 모든 게시물을 릴스로(카드 → 카드 영상). 팔로워 100명 또는 11/4 판정
const REPEAT_DAYS = 30;

export function loadRaw(rawDir) {
  const raw = {};
  for (const f of readdirSync(rawDir)) if (f.endsWith('.json')) raw[f.replace(/\.json$/, '')] = readJson(new URL(f, rawDir));
  return raw;
}

// 같은 종류의 게시물 id 는 날짜를 빼고 비교(compare-driver-2026-10-18 → compare-driver)
export const baseId = (id) => id.replace(/-\d{4}-\d{2}-\d{2}$/, '');

export function candidates(raw, date) {
  const list = [];
  for (const [src, ev] of Object.entries(raw)) {
    if (!src.startsWith('tour-') || !src.endsWith('-latest')) continue;
    if (ev.state === 'post' && daysBetween(ev.end.slice(0, 10), date) <= 4) {
      const p = makeTour(ev, src);
      if (p) list.push(p);
    }
  }
  if (raw.gear) {
    for (const cat of GEAR_ORDER) {
      for (const make of makeGear) {
        const p = make(raw.gear, cat, date);
        if (p) list.push(p);
      }
    }
    if (V2) for (const t of pickTargets(raw.gear)) {
      const p = pickPost(raw.gear, t, date);
      if (p) list.push(p);
    }
  }
  return list;
}

export const postedToday = (state, date) => (state.history || []).filter((h) => h.date === date);

export function choose(list, state, date) {
  if (postedToday(state, date).length >= DAILY_MAX) return null;
  const recent = (p) => {
    const last = state.posted?.[baseId(p.id)];
    return last && daysBetween(last, date) < (p.kind === 'tour' ? 99999 : REPEAT_DAYS);
  };
  const tour = list.find((p) => p.kind === 'tour' && !recent(p));
  if (tour) return tour;
  const todayCats = new Set(postedToday(state, date).map((h) => h.category).filter(Boolean));
  const gear = list.filter((p) => p.kind !== 'tour' && !recent(p));
  // 종류 순환: 마지막으로 올린 종류의 다음 종류부터
  const last = KIND_CYCLE.indexOf(state.lastGearKind);
  const order = KIND_CYCLE.map((_, i) => KIND_CYCLE[(last + 1 + i) % KIND_CYCLE.length]);
  for (const kind of order) {
    const pool = gear.filter((p) => p.kind === kind);
    const p = pool.find((x) => !todayCats.has(x.category)) || pool[0];
    if (p) return p;
  }
  return gear[0] || null;
}

// 저녁 슬롯(17시 이후 KST)만 릴스, 그날 이미 릴스를 올렸으면 캐러셀
export function isReelDay(date) {
  return REEL_DAYS.includes(new Date(`${date}T12:00:00+09:00`).getUTCDay());
}
export function formatFor(date, state, now = new Date()) {
  const hourKst = (now.getUTCHours() + 9) % 24;
  const reelDone = postedToday(state, date).some((h) => h.format === 'reel');
  // 2026-10-21: 팔로워 0명이라 캐러셀(피드) 도달이 모두 0, 릴스만 비팔로워에게 100회 안팎 도달(인사이트 10/18~20)
  // → 팔로워 100명이 될 때까지 카드 게시물도 릴스(카드 영상)로 올린다. 되돌리기: REELS_FIRST = false
  if (REELS_FIRST) return 'reel';
  return isReelDay(date) && hourKst >= 17 && !reelDone ? 'reel' : 'carousel';
}
