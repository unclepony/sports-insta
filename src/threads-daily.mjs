// 스레드 매일 작업(.github/workflows/threads-daily.yml 에서 단계별로 부름). 하루 최대 2개.
//   node src/threads-daily.mjs build     오늘 글 고르기 → 검증 → Q&A 카드 렌더링 → out/media/<날짜>/<id>/, out/threads-today.json
//   node src/threads-daily.mjs publish   공개 URL 확인 → 스레드 게시 → data/threads-state.json (토큰 없거나 DRY_RUN=1 이면 미리보기만)
//   node src/threads-daily.mjs insights  게시물별 조회·좋아요·답글·리포스트·공유, 계정 조회·링크 클릭·팔로워 → data/threads-insights/<날짜>.json + ops 대시보드
//   node src/threads-daily.mjs report    reports/threads/<날짜>.md + ops.unclepony.com 보고
import { existsSync, readdirSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { ROOT, daysBetween, readJson, today } from './util.mjs';
import { loadRaw } from './plan.mjs';
import { validatePost } from './validate.mjs';
import { openBrowser, renderCards } from './render.mjs';
import { qaItems, threadsPost } from './posts/threads-qa.mjs';
import { me, publishImage, recentThreads, thConfig, threadInsights, userInsights } from './threads.mjs';

export const TH_DAILY_MAX = 2;
const date = process.env.RUN_DATE || today();
const STATE = new URL('data/threads-state.json', ROOT);
const TODAY = new URL('out/threads-today.json', ROOT);
const loadState = () => (existsSync(STATE) ? readJson(STATE) : { posted: {}, history: [] });
const saveJson = (url, obj) => writeFile(url, JSON.stringify(obj, null, 1) + '\n');

async function build() {
  const rawDir = new URL(`data/raw/${date}/`, ROOT);
  if (!existsSync(new URL('gear.json', rawDir))) throw new Error(`원본 없음: data/raw/${date}/gear.json — fetch-gear 먼저`);
  const raw = loadRaw(rawDir);
  const state = loadState();
  const todays = state.history.filter((h) => h.date === date);
  const out = { date, status: 'skipped', post: null, rejected: [] };
  await rm(new URL('out/media/', ROOT), { recursive: true, force: true });
  if (todays.length >= TH_DAILY_MAX) { out.status = 'capped'; }
  else {
    const browser = await openBrowser();
    try {
      for (const item of qaItems(raw.gear).filter((it) => !state.posted[`th-${it.slug}-${it.i}`]).slice(0, 5)) {
        const post = threadsPost(raw.gear, item, date, state.history.length);
        const errors = validatePost(post, rawDir);
        if (errors.length) { out.rejected.push({ id: post.id, errors }); continue; }
        try {
          const dir = new URL(`out/media/${date}/${post.id}/`, ROOT);
          const files = await renderCards(browser, post, dir);
          out.post = { id: post.id, series: post.series, category: post.category, dir: `${date}/${post.id}/`, image: files[0], text: post.text, url: post.url };
          out.status = 'built';
          break;
        } catch (e) { out.rejected.push({ id: post.id, errors: [e.message] }); }
      }
    } finally { await browser.close(); }
  }
  await mkdir(new URL('out/', ROOT), { recursive: true });
  await saveJson(TODAY, out);
  console.log(out.post ? `✓ 스레드 글: ${out.post.id}` : out.status === 'capped' ? `오늘 한도(${TH_DAILY_MAX}개) 채움` : '✗ 올릴 글 없음');
  for (const r of out.rejected) console.log(`  거절 ${r.id}: ${r.errors.slice(0, 2).join(' / ')}`);
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
  const t = readJson(TODAY);
  if (t.status !== 'built') { console.log('게시할 것 없음'); return; }
  const cfg = thConfig();
  const base = process.env.MEDIA_BASE_URL?.replace(/\/$/, '');
  if (!cfg || !base || process.env.DRY_RUN === '1') {
    t.status = 'dry-run';
    t.dryRunReason = !cfg ? '스레드 토큰 없음(THREADS_ACCESS_TOKEN)' : !base ? 'MEDIA_BASE_URL 없음' : 'DRY_RUN=1';
    if (cfg) { try { const u = await me(cfg); t.check = `@${u.username} 연결됨`; } catch (e) { t.check = e.message; } }
    await saveJson(TODAY, t);
    console.log(`미리보기만(${t.dryRunReason})${t.check ? ` — ${t.check}` : ''}: ${t.post.id}`);
    return;
  }
  const imageUrl = `${base}/${t.post.dir}${t.post.image}`;
  await waitUrl(imageUrl);
  const { id: userId } = await me(cfg);
  const info = await publishImage(userId, imageUrl, t.post.text, cfg);
  const state = loadState();
  state.posted[t.post.id] = t.date;
  state.history.push({ date: t.date, id: t.post.id, category: t.post.category, mediaId: info.id, permalink: info.permalink, url: t.post.url });
  await saveJson(STATE, state);
  Object.assign(t, { status: 'published', mediaId: info.id, permalink: info.permalink });
  await saveJson(TODAY, t);
  console.log(`✓ 스레드 게시: ${info.permalink}`);
}

async function insights() {
  const cfg = thConfig();
  if (!cfg) { console.log('스레드 토큰 없음 — 지표 수집 건너뜀'); return; }
  const state = loadState();
  const { id: userId, username } = await me(cfg);
  const posts = [];
  for (const m of (await recentThreads(userId, cfg, 30)).filter((x) => daysBetween(x.timestamp.slice(0, 10), date) <= 30)) {
    const ours = state.history.find((h) => h.mediaId === m.id);
    posts.push({ id: m.id, at: m.timestamp, permalink: m.permalink, post: ours?.id || null, ...(await threadInsights(m.id, cfg)) });
  }
  // 계정 지표: 어제 0시(KST)부터 지금까지
  const since = Math.floor(Date.parse(`${date}T00:00:00+09:00`) / 1000) - 86400;
  const account = { username, ...(await userInsights(userId, cfg, since, Math.floor(Date.now() / 1000))) };
  await mkdir(new URL('data/threads-insights/', ROOT), { recursive: true });
  await saveJson(new URL(`data/threads-insights/${date}.json`, ROOT), { date, account, posts });
  console.log(`스레드 지표: 글 ${posts.length}개, 팔로워 ${account.followers ?? '?'}, 링크 클릭 ${account.clicks ?? '?'}`);
  await sendMetrics({ account, posts });
}

// ops 대시보드(POST /api/metrics, source threads). 게시물 지표는 누적이라 전날 값과의 차이를 하루 값으로.
async function sendMetrics({ account, posts }) {
  const url = process.env.OPS_URL?.replace(/\/api\/report$/, '/api/metrics');
  if (!url || !process.env.OPS_KEY) { console.log('OPS 키 없음 — 대시보드 전송 건너뜀'); return; }
  const dir = new URL('data/threads-insights/', ROOT);
  const prevFile = readdirSync(dir).filter((f) => f.endsWith('.json') && f < `${date}.json`).sort().at(-1);
  const prev = prevFile ? readJson(new URL(prevFile, dir)) : null;
  const rows = [], names = [], sums = {};
  for (const p of posts) {
    const before = prev?.posts?.find((x) => x.id === p.id);
    for (const metric of ['views', 'likes', 'replies', 'reposts', 'shares']) {
      if (typeof p[metric] !== 'number') continue;
      const v = Math.max(0, p[metric] - (typeof before?.[metric] === 'number' ? before[metric] : 0));
      rows.push({ day: date, metric, dim: p.id, value: v });
      sums[metric] = (sums[metric] || 0) + v;
    }
    names.push({ k: p.id, label: p.post || '스레드 글', extra: p.at.slice(0, 10) });
  }
  for (const [m, v] of Object.entries(sums)) rows.push({ day: date, metric: m, value: v });
  if (typeof account.followers === 'number') rows.push({ day: date, metric: 'followers', value: account.followers });
  if (typeof account.views === 'number') rows.push({ day: date, metric: 'profile_visits', value: account.views });
  if (typeof account.clicks === 'number') rows.push({ day: date, metric: 'link_clicks', value: account.clicks });
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-ops-key': process.env.OPS_KEY },
    body: JSON.stringify({ source: 'threads', entity: 'atlgolf', rows, names }) });
  console.log(`대시보드 스레드 지표 ${rows.length}줄 전송: ${res.status}`);
}

async function report() {
  const t = existsSync(TODAY) ? readJson(TODAY) : { status: 'none' };
  const insFile = new URL(`data/threads-insights/${date}.json`, ROOT);
  const ins = existsSync(insFile) ? readJson(insFile) : null;
  const statusText = { published: '게시 완료', 'dry-run': `미리보기만 (${t.dryRunReason})`, capped: `오늘 한도(${TH_DAILY_MAX}개) 채움`, skipped: '올릴 글 없음', built: '만들었지만 게시 단계 미실행', none: '실행 기록 없음' }[t.status] || t.status;
  const lines = [
    `# 스레드 매일 작업 ${date}: ${statusText}`,
    '',
    t.post ? `- 글: **${t.post.series}** (\`${t.post.id}\`)` : '',
    t.permalink ? `- 링크: ${t.permalink}` : '',
    t.check ? `- 점검: ${t.check}` : '',
    ...(t.rejected || []).map((r) => `- 검증에서 거절: \`${r.id}\` — ${r.errors.slice(0, 2).join(' / ')}`),
    ins ? `\n## 계정\n- @${ins.account.username} · 팔로워 ${ins.account.followers ?? '?'} · 프로필 조회 ${ins.account.views ?? '?'} · 링크 클릭 ${ins.account.clicks ?? '?'}` : '',
    ins?.posts?.length ? `\n## 최근 글\n| 날짜 | 글 | 조회 | 좋아요 | 답글 |\n|---|---|---|---|---|\n${ins.posts.slice(0, 10).map((x) => `| ${x.at.slice(0, 10)} | ${x.post || '-'} | ${x.views ?? '-'} | ${x.likes ?? '-'} | ${x.replies ?? '-'} |`).join('\n')}` : '',
  ].filter((l) => l !== '');
  await mkdir(new URL('reports/threads/', ROOT), { recursive: true });
  await writeFile(new URL(`reports/threads/${date}.md`, ROOT), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  if (process.env.OPS_URL && process.env.OPS_KEY) {
    const kind = (t.rejected || []).length || t.status === 'skipped' ? 'error' : t.status === 'published' ? 'upload' : 'info';
    const r = await fetch(process.env.OPS_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'x-ops-key': process.env.OPS_KEY },
      body: JSON.stringify({ site: 'sports-insta', kind, title: lines[0].replace(/^# /, ''), body: lines.slice(1).join('\n'), link: t.permalink || '', source: 'GitHub threads-daily' }) });
    console.log('ops 보고', r.status);
  }
}

const cmd = process.argv[2];
const steps = { build, publish, insights, report };
if (!steps[cmd]) { console.error(`사용: node src/threads-daily.mjs ${Object.keys(steps).join('|')}`); process.exit(2); }
await steps[cmd]();
