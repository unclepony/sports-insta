// 매일 자동 작업. 단계별로 나눠 GitHub Actions 에서 차례로 부른다.
//   node src/daily.mjs build     오늘 게시물 고르기 → 검증 → 카드/릴스 렌더링 → out/media/<날짜>/<id>/, out/today.json
//   node src/daily.mjs publish   공개 URL 확인 → 인스타 게시 → data/state.json 기록 (키 없거나 DRY_RUN=1 이면 미리보기만)
//   node src/daily.mjs insights  최근 게시물 지표·계정 지표·댓글 → data/insights/<날짜>.json
//   node src/daily.mjs report    reports/daily/<날짜>.md 작성 + ops.unclepony.com 보고
// 원칙: 검증에 실패한 게시물은 절대 올리지 않는다. 실패하면 다음 후보로 넘어가고, 다 실패하면 그날은 쉰다(오류 보고).
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { ROOT, brand, daysBetween, readJson, today } from './util.mjs';
import { DAILY_MAX, baseId, candidates, choose, formatFor, loadRaw, postedToday } from './plan.mjs';
import { validatePost } from './validate.mjs';
import { openBrowser, renderCards, renderReel, renderReelFrames } from './render.mjs';
import { clipCandidates, renderClip } from './clip.mjs';
import { accountInsights, igConfig, mediaComments, mediaInsights, publishCarousel, publishLimit, publishReel, recentMedia } from './instagram.mjs';

const date = process.env.RUN_DATE || today();
const STATE = new URL('data/state.json', ROOT);
const TODAY = new URL('out/today.json', ROOT);
const loadState = () => (existsSync(STATE) ? readJson(STATE) : { posted: {}, history: [] });
const saveJson = (url, obj) => writeFile(url, JSON.stringify(obj, null, 1) + '\n');

async function build() {
  const rawDir = new URL(`data/raw/${date}/`, ROOT);
  if (!existsSync(rawDir)) throw new Error(`원본 없음: data/raw/${date} — fetch 먼저`);
  const raw = loadRaw(rawDir);
  const state = loadState();
  let list = candidates(raw, date);
  const format = formatFor(date, state);
  const tried = [];
  const mediaRoot = new URL(`out/media/${date}/`, ROOT);
  await rm(new URL('out/media/', ROOT), { recursive: true, force: true });
  const browser = await openBrowser();
  let result = null;
  try {
    // 저녁 슬롯(매일): 아직 안 올린 투어 결과가 없으면 ATL골프기어 초보 Q&A 쇼츠(media/clips)를 릴스로 먼저
    // (초보 Q&A 쇼츠가 유튜브에서 반응이 좋음, 2026-10-18). 2026-10-19 사장님 결정: 22시 슬롯에 릴스 1개 더(하루 릴스 최대 2개·게시 4개, 실험 2주).
    const hourKst = (new Date().getUTCHours() + 9) % 24;
    const tourFirst = choose(list, state, date)?.kind === 'tour';
    const todays = postedToday(state, date);
    const reelCap = hourKst >= 21 ? 2 : 1;
    if (hourKst >= 17 && !tourFirst && todays.length < DAILY_MAX && todays.filter((h) => h.format === 'reel').length < reelCap) {
      for (const clip of clipCandidates(state)) {
        try {
          const dir = new URL(`${clip.id}/`, mediaRoot);
          const { files, cover } = await renderClip(clip, dir);
          result = { id: clip.id, kind: 'clip', category: clip.category, series: clip.series, format: 'reel', dir: `${date}/${clip.id}/`, files, cover, caption: clip.caption, warnings: [] };
          break;
        } catch (e) { tried.push({ id: clip.id, errors: [e.message] }); }
      }
    }
    for (let attempt = 0; attempt < 6 && !result; attempt++) {
      const post = choose(list, state, date);
      if (!post) break;
      list = list.filter((p) => p !== post);
      const errors = validatePost(post, rawDir);
      if (errors.length) { tried.push({ id: post.id, errors }); continue; }
      const dir = new URL(`${post.id}/`, mediaRoot);
      try {
        const cards = await renderCards(browser, post, dir);
        const files = format === 'reel' ? [await renderReel(dir, await renderReelFrames(browser, post, dir, cards))] : cards;
        result = { id: post.id, kind: post.kind, category: post.category || null, series: post.series, format, dir: `${date}/${post.id}/`, files, cover: cards[0], caption: post.caption, warnings: post.warnings };
      } catch (e) { tried.push({ id: post.id, errors: [e.message] }); }
    }
  } finally { await browser.close(); }
  // 오늘 한도(DAILY_MAX)를 이미 채웠으면 '쉬어 감'이 아니라 정상(capped) — 오류로 보고하지 않는다
  const capped = !result && postedToday(state, date).length >= DAILY_MAX;
  const out = { date, status: result ? 'built' : capped ? 'capped' : 'skipped', post: result, rejected: tried };
  await mkdir(new URL('out/', ROOT), { recursive: true });
  await saveJson(TODAY, out);
  console.log(result ? `✓ 오늘 게시물: ${result.id} (${result.format}, ${result.files.length}개 파일)` : '✗ 올릴 수 있는 게시물 없음');
  for (const t of tried) console.log(`  거절 ${t.id}: ${t.errors.slice(0, 3).join(' / ')}`);
}

async function waitUrl(url, maxMs = 5 * 60e3) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try { const r = await fetch(url, { method: 'HEAD' }); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 10e3));
  }
  throw new Error(`공개 URL 에 접근할 수 없음: ${url}`);
}

async function publish() {
  const today = readJson(TODAY);
  if (today.status !== 'built') { console.log('게시할 것 없음'); return; }
  const p = today.post;
  const cfg = igConfig();
  const base = process.env.MEDIA_BASE_URL?.replace(/\/$/, '');
  const urls = p.files.map((f) => `${base}/${p.dir}${f}`);
  if (!cfg || !base || process.env.DRY_RUN === '1') {
    today.status = 'dry-run';
    today.dryRunReason = !cfg ? '인스타 키 없음(IG_USER_ID·IG_ACCESS_TOKEN)' : !base ? 'MEDIA_BASE_URL 없음' : 'DRY_RUN=1';
    if (cfg) {
      // 키가 있으면 게시만 빼고 연결 점검: 공개 URL, 계정, 게시 권한(게시 한도 조회)
      const check = {};
      try { await waitUrl(urls[0], 60e3); check.media = '공개 URL 접근 됨'; } catch (e) { check.media = e.message; }
      try { const a = await accountInsights(cfg); check.account = a.username ? `@${a.username} (팔로워 ${a.followers})` : a.profileError; } catch (e) { check.account = e.message; }
      try { const l = await publishLimit(cfg); check.publish = `게시 권한 있음 (오늘 ${l.used ?? 0}/${l.total ?? '?'})`; } catch (e) { check.publish = `게시 권한 확인 실패: ${e.message}`; }
      today.check = check;
      console.log('연결 점검:', JSON.stringify(check));
    }
    await saveJson(TODAY, today);
    console.log(`미리보기만(${today.dryRunReason}): ${p.id} ${p.format}`);
    return;
  }
  for (const u of urls) await waitUrl(u);
  const limit = await publishLimit(cfg).catch(() => null);
  if (limit?.total && limit.used >= limit.total) throw new Error(`하루 게시 한도 도달 ${limit.used}/${limit.total}`);
  const info = p.format === 'reel'
    ? await publishReel(urls[0], p.caption, cfg, `${base}/${p.dir}${p.cover}`)
    : await publishCarousel(urls, p.caption, cfg);
  const state = loadState();
  state.posted[baseId(p.id)] = today.date;
  if (['pick', 'compare', 'tips'].includes(p.kind)) state.lastGearKind = p.kind;
  state.history.push({ date: today.date, id: p.id, kind: p.kind, category: p.category, format: p.format, mediaId: info.id, permalink: info.permalink });
  await saveJson(STATE, state);
  Object.assign(today, { status: 'published', mediaId: info.id, permalink: info.permalink });
  await saveJson(TODAY, today);
  console.log(`✓ 게시: ${info.permalink}`);
}

async function insights() {
  const cfg = igConfig();
  if (!cfg) { console.log('인스타 키 없음 — 지표 수집 건너뜀'); return; }
  const state = loadState();
  const media = await recentMedia(cfg, 30);
  const posts = [];
  for (const m of media.filter((x) => daysBetween(x.timestamp.slice(0, 10), date) <= 30)) {
    const ours = state.history.find((h) => h.mediaId === m.id);
    posts.push({
      id: m.id, at: m.timestamp, type: m.media_product_type || m.media_type, permalink: m.permalink,
      post: ours?.id || null, kind: ours?.kind || null, category: ours?.category || null, format: ours?.format || null,
      likes: m.like_count ?? null, comments: m.comments_count ?? null,
      ...(await mediaInsights(m.id, cfg)),
      // 릴스 평균 시청 시간(밀리초) — 릴스만
      ...((m.media_product_type === 'REELS') ? await mediaInsights(m.id, cfg, ['ig_reels_avg_watch_time', 'ig_reels_video_view_total_time']) : {}),
      recentComments: daysBetween(m.timestamp.slice(0, 10), date) <= 7 ? await mediaComments(m.id, cfg) : undefined,
    });
  }
  const account = await accountInsights(cfg);
  await mkdir(new URL('data/insights/', ROOT), { recursive: true });
  await saveJson(new URL(`data/insights/${date}.json`, ROOT), { date, account, posts });
  console.log(`지표: 게시물 ${posts.length}개, 팔로워 ${account.followers ?? '?'}`);
  await sendMetrics({ date, account, posts });
}

// ops.unclepony.com/dashboard 로 지표 보내기(POST /api/metrics, unclepony-ops README 형식).
// 게시물 지표는 누적값이라, 전날 저장한 값과의 차이를 '그날 하루 값'으로 보낸다(처음 본 게시물은 누적값 그대로).
async function sendMetrics({ date: day, account, posts }) {
  const url = process.env.OPS_METRICS_URL || process.env.OPS_URL?.replace(/\/api\/report$/, '/api/metrics');
  if (!url || !process.env.OPS_KEY) { console.log('OPS 키 없음 — 대시보드 전송 건너뜀'); return; }
  const dir = new URL('data/insights/', ROOT);
  const prevFile = (await import('node:fs')).readdirSync(dir).filter((f) => f.endsWith('.json') && f < `${day}.json`).sort().at(-1);
  const prev = prevFile ? readJson(new URL(prevFile, dir)) : null;
  const MAP = { reach: 'reach', views: 'views', likes: 'likes', comments: 'comments', saved: 'saves', shares: 'shares' };
  const rows = [], names = [], sums = {};
  for (const p of posts) {
    const before = prev?.posts?.find((x) => x.id === p.id);
    for (const [k, metric] of Object.entries(MAP)) {
      if (typeof p[k] !== 'number') continue;
      const v = Math.max(0, p[k] - (typeof before?.[k] === 'number' ? before[k] : 0));
      rows.push({ day, metric, dim: p.id, value: v });
      sums[metric] = (sums[metric] || 0) + v;
    }
    if (typeof p.ig_reels_avg_watch_time === 'number') rows.push({ day, metric: 'avg_watch_sec', dim: p.id, value: Math.round(p.ig_reels_avg_watch_time / 100) / 10 });
    names.push({ k: p.id, label: p.post || (p.type === 'REELS' ? '릴스' : '게시물'), extra: p.at.slice(0, 10) });
  }
  // 계정 합계: 도달은 계정 지표(그날), 나머지는 게시물 하루 값의 합
  if (typeof account.reach === 'number') rows.push({ day, metric: 'reach', value: account.reach });
  for (const m of ['views', 'likes', 'comments', 'saves', 'shares']) if (sums[m] !== undefined) rows.push({ day, metric: m, value: sums[m] });
  if (typeof account.followers === 'number') rows.push({ day, metric: 'followers', value: account.followers });
  if (typeof account.profile_views === 'number') rows.push({ day, metric: 'profile_visits', value: account.profile_views });
  if (typeof (account.profile_links_taps ?? account.website_clicks) === 'number') rows.push({ day, metric: 'link_taps', value: account.profile_links_taps ?? account.website_clicks });
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-ops-key': process.env.OPS_KEY },
    body: JSON.stringify({ source: 'insta', entity: 'atlgolf', rows, names }) });
  console.log(`대시보드 지표 ${rows.length}줄 전송: ${res.status}`);
}

async function report() {
  const t = existsSync(TODAY) ? readJson(TODAY) : { status: 'none' };
  const insFile = new URL(`data/insights/${date}.json`, ROOT);
  const ins = existsSync(insFile) ? readJson(insFile) : null;
  const p = t.post;
  const statusText = { published: '게시 완료', 'dry-run': `미리보기만 (${t.dryRunReason})`, built: '만들었지만 게시 단계 미실행', skipped: '올릴 수 있는 게시물 없음 — 쉬어 감', capped: `오늘 한도(${DAILY_MAX}개) 채움`, none: '실행 기록 없음' }[t.status] || t.status;
  const lines = [
    `# 인스타 매일 작업 ${date}: ${statusText}`,
    '',
    ...(t.check ? Object.entries(t.check).map(([k, v]) => `- 점검 ${k}: ${v}`) : []),
    p ? `- 게시물: **${p.series}** (\`${p.id}\`, ${p.format === 'reel' ? '릴스' : `캐러셀 ${p.files.length}장`})` : '- 게시물: 없음',
    t.permalink ? `- 링크: ${t.permalink}` : '',
    ...(p?.warnings || []).map((w) => `- 주의: ${w}`),
    ...(t.rejected || []).map((r) => `- 검증에서 거절: \`${r.id}\` — ${r.errors.slice(0, 2).join(' / ')}`),
    '',
    ins ? `## 계정\n- 팔로워 ${ins.account.followers ?? '?'} · 하루 도달 ${ins.account.reach ?? '?'} · 프로필 방문 ${ins.account.profile_views ?? '?'} · 링크 클릭 ${ins.account.profile_links_taps ?? ins.account.website_clicks ?? '?'}` : '',
    ins?.posts?.length ? `\n## 최근 게시물 (30일)\n| 날짜 | 게시물 | 형식 | 도달 | 저장 | 공유 |\n|---|---|---|---|---|---|\n${ins.posts.slice(0, 10).map((x) => `| ${x.at.slice(0, 10)} | ${x.post || '-'} | ${x.format || x.type} | ${x.reach ?? '-'} | ${x.saved ?? '-'} | ${x.shares ?? '-'} |`).join('\n')}` : '',
    ins?.posts?.some((x) => x.recentComments?.length) ? `\n## 최근 댓글 (정정 요청 확인용)\n${ins.posts.flatMap((x) => (x.recentComments || []).map((c) => `- ${x.post || x.id}: ${c.text.replace(/\s+/g, ' ').slice(0, 120)}`)).slice(0, 20).join('\n')}` : '',
    '',
    `되돌리기: 게시물 삭제는 \`node src/daily.mjs delete <미디어 ID>\` 또는 인스타 앱에서. 코드 변경은 git revert.`,
  ].filter((l) => l !== '');
  const md = lines.join('\n') + '\n';
  await mkdir(new URL('reports/daily/', ROOT), { recursive: true });
  await writeFile(new URL(`reports/daily/${date}.md`, ROOT), md);
  console.log(md);
  if (process.env.OPS_URL && process.env.OPS_KEY) {
    const kind = t.status === 'skipped' || (t.rejected || []).length ? 'error' : t.status === 'published' ? 'upload' : 'info';
    const r = await fetch(process.env.OPS_URL, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-ops-key': process.env.OPS_KEY },
      body: JSON.stringify({ site: 'sports-insta', kind, title: lines[0].replace(/^# /, ''), body: lines.slice(1).join('\n'), link: t.permalink || '', source: 'GitHub daily' }),
    });
    console.log('ops 보고', r.status);
  }
}

async function remove(id) {
  const cfg = igConfig();
  if (!cfg || !id) throw new Error('사용: IG 키 설정 후 node src/daily.mjs delete <미디어 ID>');
  const { deleteMedia } = await import('./instagram.mjs');
  await deleteMedia(id, cfg);
  console.log(`삭제: ${id}`);
}

const cmd = process.argv[2];
const steps = { build, publish, insights, report, delete: () => remove(process.argv[3]) };
if (!steps[cmd]) { console.error(`사용: node src/daily.mjs ${Object.keys(steps).join('|')}`); process.exit(2); }
await steps[cmd]();
