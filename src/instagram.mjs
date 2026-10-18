// Instagram API with Instagram Login (공식). 비공식 로그인 자동화는 쓰지 않는다.
// 필요한 값: IG_USER_ID, IG_ACCESS_TOKEN (권한 instagram_business_basic, instagram_business_content_publish,
//            인사이트·댓글은 instagram_business_manage_insights, instagram_business_manage_comments)
// 인스타는 미디어를 '공개 URL'에서 가져간다 → 이미지·영상은 먼저 MEDIA_BASE_URL 에 올려 둔다.

const VERSION = process.env.IG_API_VERSION || 'v23.0';
const BASE = `https://graph.instagram.com/${VERSION}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function igConfig() {
  const userId = process.env.IG_USER_ID, token = process.env.IG_ACCESS_TOKEN;
  return userId && token ? { userId, token } : null;
}

async function call(method, path, params, { token }) {
  const url = new URL(`${BASE}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: token });
  const res = method === 'GET'
    ? await fetch(`${url}?${body}`)
    : await fetch(url, { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    // 토큰이 오류 메시지에 섞여 나오지 않게 메시지·코드만
    throw new Error(`인스타 API ${path}: ${json.error?.message || res.status} (code ${json.error?.code ?? '-'})`);
  }
  return json;
}

// 컨테이너 처리 완료까지 기다림(영상은 수십 초~몇 분)
async function waitReady(id, cfg, maxMs = 10 * 60e3) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const { status_code: s, status } = await call('GET', id, { fields: 'status_code,status' }, cfg);
    if (s === 'FINISHED') return;
    if (s === 'ERROR' || s === 'EXPIRED') throw new Error(`미디어 처리 실패: ${s} ${status || ''}`);
    await sleep(5000);
  }
  throw new Error('미디어 처리 시간 초과');
}

export async function publishLimit(cfg) {
  const j = await call('GET', `${cfg.userId}/content_publishing_limit`, { fields: 'quota_usage,config' }, cfg);
  const d = j.data?.[0] || {};
  return { used: d.quota_usage ?? null, total: d.config?.quota_total ?? null };
}

async function finishPublish(creationId, cfg) {
  await waitReady(creationId, cfg);
  const { id } = await call('POST', `${cfg.userId}/media_publish`, { creation_id: creationId }, cfg);
  const info = await call('GET', id, { fields: 'id,permalink,timestamp' }, cfg);
  return info;
}

export async function publishCarousel(imageUrls, caption, cfg) {
  const children = [];
  for (const image_url of imageUrls) {
    const { id } = await call('POST', `${cfg.userId}/media`, { image_url, is_carousel_item: 'true' }, cfg);
    children.push(id);
  }
  for (const c of children) await waitReady(c, cfg);
  const { id } = await call('POST', `${cfg.userId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption }, cfg);
  return finishPublish(id, cfg);
}

export async function publishReel(videoUrl, caption, cfg, coverUrl) {
  const params = { media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: 'true' };
  if (coverUrl) params.cover_url = coverUrl;
  const { id } = await call('POST', `${cfg.userId}/media`, params, cfg);
  return finishPublish(id, cfg);
}

export async function deleteMedia(mediaId, cfg) {
  return call('DELETE', mediaId, {}, cfg);
}

// 최근 게시물 + 게시물별 지표(셀프 개선용). 지표 이름은 API 버전마다 바뀌므로 하나씩 시도한다.
export async function recentMedia(cfg, limit = 25) {
  const j = await call('GET', `${cfg.userId}/media`, { fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count', limit: String(limit) }, cfg);
  return j.data || [];
}

export async function mediaInsights(id, cfg, metrics = ['reach', 'views', 'saved', 'shares', 'total_interactions', 'likes', 'comments']) {
  const out = {};
  for (const metric of metrics) {
    try {
      const j = await call('GET', `${id}/insights`, { metric }, cfg);
      out[metric] = j.data?.[0]?.values?.[0]?.value ?? j.data?.[0]?.total_value?.value ?? null;
    } catch { out[metric] = null; }
  }
  return out;
}

export async function accountInsights(cfg) {
  const out = {};
  try {
    const p = await call('GET', cfg.userId, { fields: 'followers_count,media_count,username' }, cfg);
    Object.assign(out, { followers: p.followers_count, mediaCount: p.media_count, username: p.username });
  } catch (e) { out.profileError = e.message; }
  for (const metric of ['reach', 'profile_views', 'profile_links_taps', 'website_clicks', 'follows_and_unfollows']) {
    try {
      const j = await call('GET', `${cfg.userId}/insights`, { metric, period: 'day', metric_type: 'total_value' }, cfg);
      out[metric] = j.data?.[0]?.total_value?.value ?? j.data?.[0]?.values?.at(-1)?.value ?? null;
    } catch { out[metric] = null; }
  }
  return out;
}

// 댓글 글자만(작성자 이름은 저장하지 않음) — '잘못된 내용 알려 주세요' 약속을 지키려고 매일 읽는다
export async function mediaComments(id, cfg) {
  try {
    const j = await call('GET', `${id}/comments`, { fields: 'text,timestamp' }, cfg);
    return (j.data || []).map((c) => ({ text: c.text, at: c.timestamp }));
  } catch { return []; }
}

// 장기 토큰 연장(60일). 발급 후 24시간 지나야 가능.
export async function refreshToken(token) {
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`토큰 연장 실패: ${j.error?.message || res.status}`);
  return { token: j.access_token, expiresIn: j.expires_in };
}
