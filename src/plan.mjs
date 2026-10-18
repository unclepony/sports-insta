// 오늘 올릴 게시물 고르기.
//  1순위: 최근 4일 안에 끝난 투어 대회 결과(아직 안 올린 것)
//  그 밖: 용품 순환 — 분류마다 '가격 비교'와 '고르는 법'을 번갈아, 같은 게시물은 30일 안에 다시 올리지 않음
//  릴스: 화·목·토요일은 그날 게시물을 캐러셀 대신 릴스로
import { readdirSync } from 'node:fs';
import { daysBetween, readJson } from './util.mjs';
import { tourPost } from './posts/tour.mjs';
import { comparePost, tipsPost } from './posts/gear.mjs';

export const GEAR_ORDER = ['driver', 'iron', 'putter', 'wedge', 'wood', 'utility', 'ball', 'shoes', 'rangefinder', 'bag', 'glove', 'gps', 'launch', 'practice'];
const REEL_DAYS = [2, 4, 6]; // 화 목 토 (0=일)
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
      const p = tourPost(ev, src);
      if (p) list.push(p);
    }
  }
  if (raw.gear) {
    for (const cat of GEAR_ORDER) {
      for (const make of [comparePost, tipsPost]) {
        const p = make(raw.gear, cat, date);
        if (p) list.push(p);
      }
    }
  }
  return list;
}

export function choose(list, state, date) {
  const recent = (p) => {
    const last = state.posted?.[baseId(p.id)];
    return last && daysBetween(last, date) < (p.kind === 'tour' ? 99999 : REPEAT_DAYS);
  };
  const tour = list.find((p) => p.kind === 'tour' && !recent(p));
  if (tour) return tour;
  // 용품: 마지막으로 올린 종류(compare/tips)와 다른 종류 우선, 분류 순서대로
  const gear = list.filter((p) => p.kind !== 'tour' && !recent(p));
  const lastKind = state.lastGearKind;
  return gear.find((p) => p.kind !== lastKind) || gear[0] || null;
}

export function isReelDay(date) {
  return REEL_DAYS.includes(new Date(`${date}T12:00:00+09:00`).getUTCDay());
}
