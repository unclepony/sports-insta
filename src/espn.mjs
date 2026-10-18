// ESPN 골프 데이터(공식 공개 API 아님, 무료). 막히거나 형식이 바뀌면 수집이 실패하고 그날 투어 게시는 건너뛴다.
// 선수 사진(headshot)·로고는 저장하지도 쓰지도 않는다(저작권).

const SCOREBOARD = (league) => `https://site.api.espn.com/apis/site/v2/sports/golf/${league}/scoreboard`;
const LEADERBOARD = (league, id) => `https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=${league}&event=${id}`;

export const LEAGUES = { pga: 'PGA 투어', lpga: 'LPGA 투어' };

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'sports-insta/0.1' } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.json();
}

// 시즌 일정에서 '가장 최근에 끝난 대회'와 '지금 진행 중인 대회'를 고른다.
export async function calendar(league, now = new Date()) {
  const j = await getJson(SCOREBOARD(league));
  const cal = j.leagues?.[0]?.calendar || [];
  const done = cal.filter((e) => new Date(e.endDate) < now).sort((a, b) => a.endDate.localeCompare(b.endDate));
  const live = cal.find((e) => new Date(e.startDate) <= now && now <= new Date(new Date(e.endDate).getTime() + 86400e3));
  const next = cal.filter((e) => new Date(e.startDate) > now).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return { latest: done.at(-1), live, next };
}

// 리더보드 → 저장용 최소 구조
export async function leaderboard(league, id) {
  const j = await getJson(LEADERBOARD(league, id));
  const e = j.events?.[0];
  if (!e) throw new Error(`${league}/${id} 대회 없음`);
  const comp = e.competitions[0];
  const course = e.courses?.find((c) => c.host) || e.courses?.[0];
  const players = comp.competitors
    .slice()
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999))
    .map((c) => ({
      id: c.athlete.id,
      name: c.athlete.displayName,
      country: c.athlete.flag?.alt || '',
      amateur: !!c.athlete.amateur,
      pos: c.status?.position?.displayName || '',
      tie: !!c.status?.position?.isTie,
      status: c.status?.type?.name || '', // STATUS_FINISH, STATUS_CUT, STATUS_WD …
      toPar: c.statistics?.find((s) => s.name === 'scoreToPar')?.value ?? null,
      toParText: c.score?.displayValue ?? '',
      total: c.score?.value ?? null,
      rounds: (c.linescores || []).map((l) => (l.value > 0 ? l.value : null)),
      earnings: c.earnings ?? null,
      thru: c.status?.thru ?? null,
    }));
  return {
    league, id: e.id, name: e.name,
    start: e.date, end: e.endDate,
    state: comp.status?.type?.state || e.status?.type?.state || '', // pre / in / post
    detail: comp.status?.type?.detail || e.status?.type?.detail || '',
    purse: e.purse ?? null,
    course: course ? { name: course.name, par: course.shotsToPar, yards: course.totalYards } : null,
    players,
  };
}
