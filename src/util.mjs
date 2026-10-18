import { readFileSync } from 'node:fs';

export const ROOT = new URL('../', import.meta.url);
export const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
export const brand = readJson(new URL('config/brand.json', ROOT));

// 한국 시간 기준 날짜(YYYY-MM-DD)
export function today(now = Date.now()) {
  return new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400e3);
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// "2026-10-16" → "10월 16일"
export function md(d) {
  const [, m, day] = d.slice(0, 10).split('-').map(Number);
  return `${m}월 ${day}일`;
}

export const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`;
export const usd = (n) => `$${Number(n).toLocaleString('en-US')}`;

// 한국 선수 한글 이름(없으면 null)
const ko = readJson(new URL('config/players-ko.json', ROOT));
export function koName(p) {
  if (ko.byId[p.id]) return ko.byId[p.id];
  if (p.country === 'South Korea' && ko.byName[p.name]) return ko.byName[p.name];
  return null;
}
export const isKorean = (p) => p.country === 'South Korea';
export const displayName = (p) => koName(p) || p.name;
