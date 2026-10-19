// Threads API (메타 공식). 필요한 값: THREADS_ACCESS_TOKEN (권한 threads_basic, threads_content_publish, threads_manage_insights)
// 사용자 ID 는 토큰으로 /me 를 불러 얻는다. 이미지는 공개 URL(GitHub Pages)에서 가져간다.
// 문서: developers.facebook.com/docs/threads (글 500자, 링크 5개 이하, 24시간 250개)

const BASE = 'https://graph.threads.com/v1.0';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function thConfig() {
  const token = process.env.THREADS_ACCESS_TOKEN;
  return token ? { token } : null;
}

async function call(method, path, params, { token }) {
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = method === 'GET' ? await fetch(`${BASE}/${path}?${body}`) : await fetch(`${BASE}/${path}`, { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`스레드 API ${path}: ${json.error?.message || res.status} (code ${json.error?.code ?? '-'})`);
  return json;
}

export async function me(cfg) {
  return call('GET', 'me', { fields: 'id,username' }, cfg);
}

async function waitReady(id, cfg, maxMs = 5 * 60e3) {
  const start = Date.now();
  await sleep(30e3); // 문서 권장: 만들고 30초쯤 기다린 뒤 게시
  while (Date.now() - start < maxMs) {
    const { status, error_message: em } = await call('GET', id, { fields: 'status,error_message' }, cfg);
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`스레드 미디어 처리 실패: ${status} ${em || ''}`);
    await sleep(5000);
  }
  throw new Error('스레드 미디어 처리 시간 초과');
}

// 이미지 + 글(글 안의 링크는 눌린다)
export async function publishImage(userId, imageUrl, text, cfg) {
  const { id } = await call('POST', `${userId}/threads`, { media_type: 'IMAGE', image_url: imageUrl, text }, cfg);
  await waitReady(id, cfg);
  const { id: mediaId } = await call('POST', `${userId}/threads_publish`, { creation_id: id }, cfg);
  const info = await call('GET', mediaId, { fields: 'id,permalink,timestamp' }, cfg);
  return info;
}

export async function recentThreads(userId, cfg, limit = 25) {
  const j = await call('GET', `${userId}/threads`, { fields: 'id,permalink,timestamp,text', limit: String(limit) }, cfg);
  return j.data || [];
}

export async function threadInsights(id, cfg) {
  const out = {};
  for (const metric of ['views', 'likes', 'replies', 'reposts', 'quotes', 'shares']) {
    try {
      const j = await call('GET', `${id}/insights`, { metric }, cfg);
      out[metric] = j.data?.[0]?.values?.[0]?.value ?? j.data?.[0]?.total_value?.value ?? null;
    } catch { out[metric] = null; }
  }
  return out;
}

// 계정 지표: 프로필 조회(views, 하루별), 팔로워, 링크 클릭(clicks, 링크별)
export async function userInsights(userId, cfg, since, until) {
  const out = {};
  const range = { since: String(since), until: String(until) };
  try {
    const j = await call('GET', `${userId}/threads_insights`, { metric: 'views', ...range }, cfg);
    out.views = (j.data?.[0]?.values || []).reduce((a, v) => a + (v.value || 0), 0);
  } catch { out.views = null; }
  try {
    const j = await call('GET', `${userId}/threads_insights`, { metric: 'clicks', ...range }, cfg);
    const vals = j.data?.[0]?.link_total_values || j.data?.[0]?.total_value?.link_total_values || [];
    out.clicks = vals.reduce((a, v) => a + (v.value || 0), 0);
    out.clicksByLink = vals.map((v) => ({ url: v.link_url, value: v.value }));
  } catch { out.clicks = null; }
  try {
    const j = await call('GET', `${userId}/threads_insights`, { metric: 'followers_count' }, cfg);
    out.followers = j.data?.[0]?.total_value?.value ?? null;
  } catch { out.followers = null; }
  return out;
}

// 장기 토큰 연장(60일). 발급 후 24시간 지나야 가능.
export async function refreshThreadsToken(token) {
  const res = await fetch(`https://graph.threads.com/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(token)}`);
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`스레드 토큰 연장 실패: ${j.error?.message || res.status}`);
  return { token: j.access_token, expiresIn: j.expires_in };
}
