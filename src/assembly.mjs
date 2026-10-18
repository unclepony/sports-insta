// 열린국회정보 Open API 클라이언트.
// 인증키(ASSEMBLY_API_KEY)가 없으면 데이터셋마다 5건만 내려온다 → sample 모드로 표시한다.

const BASE = 'https://open.assembly.go.kr/portal/openapi';
export const AGE = '22';

export const DATASETS = {
  bills: 'nzmimeepazxkubdpn', // 국회의원 발의법률안
  plenary: 'ncocpgfiaoituanbr', // 본회의 처리안건(법률안) — 찬성·반대·기권 수 포함
  members: 'nwvrqwxyaytdsfvhu', // 국회의원 인적사항
};

const KEY = process.env.ASSEMBLY_API_KEY || '';
export const SAMPLE_MODE = !KEY;
const PAGE_SIZE = SAMPLE_MODE ? 5 : 1000;

async function page(code, params, pIndex) {
  const qs = new URLSearchParams({ KEY, Type: 'json', pIndex: String(pIndex), pSize: String(PAGE_SIZE), ...params });
  const res = await fetch(`${BASE}/${code}?${qs}`, { headers: { 'User-Agent': 'politics-insta/0.1' } });
  if (!res.ok) throw new Error(`${code} HTTP ${res.status}`);
  const json = await res.json();
  if (!json[code]) {
    // 데이터 없음(INFO-200)은 빈 목록, 그 밖의 코드는 오류
    if (json.RESULT?.CODE === 'INFO-200') return { total: 0, rows: [] };
    throw new Error(`${code} ${json.RESULT?.CODE} ${json.RESULT?.MESSAGE}`);
  }
  const head = json[code][0].head;
  const code0 = head[1].RESULT.CODE;
  if (code0 !== 'INFO-000') throw new Error(`${code} ${code0} ${head[1].RESULT.MESSAGE}`);
  return { total: head[0].list_total_count, rows: json[code][1].row };
}

// 전체 페이지를 모은다. maxRows 로 상한을 둔다(최신순 데이터라 앞부분만 필요할 때).
export async function fetchAll(code, params = {}, maxRows = Infinity) {
  const first = await page(code, params, 1);
  const rows = [...first.rows];
  if (!SAMPLE_MODE) {
    for (let p = 2; rows.length < Math.min(first.total, maxRows); p++) {
      const next = await page(code, params, p);
      if (!next.rows.length) break;
      rows.push(...next.rows);
    }
  }
  return { total: first.total, rows: rows.slice(0, maxRows) };
}

// 저장할 필드만 고른다(의원 연락처·보좌진 등 개인 정보는 저장하지 않는다).
export const pick = {
  bill: (r) => ({
    BILL_ID: r.BILL_ID, BILL_NO: r.BILL_NO, BILL_NAME: r.BILL_NAME, PROPOSE_DT: r.PROPOSE_DT,
    PROPOSER: r.PROPOSER, RST_PROPOSER: r.RST_PROPOSER, RST_MONA_CD: r.RST_MONA_CD,
    COMMITTEE: r.COMMITTEE, PROC_RESULT: r.PROC_RESULT, DETAIL_LINK: r.DETAIL_LINK,
  }),
  plenary: (r) => ({
    BILL_ID: r.BILL_ID, BILL_NO: r.BILL_NO, BILL_NAME: r.BILL_NAME, PROC_DT: r.PROC_DT,
    PROC_RESULT_CD: r.PROC_RESULT_CD, CURR_COMMITTEE: r.CURR_COMMITTEE,
    MEMBER_TCNT: r.MEMBER_TCNT, VOTE_TCNT: r.VOTE_TCNT, YES_TCNT: r.YES_TCNT, NO_TCNT: r.NO_TCNT,
    BLANK_TCNT: r.BLANK_TCNT, LINK_URL: r.LINK_URL,
  }),
  member: (r) => ({
    MONA_CD: r.MONA_CD, HG_NM: r.HG_NM, POLY_NM: r.POLY_NM, ORIG_NM: r.ORIG_NM,
    ELECT_GBN_NM: r.ELECT_GBN_NM, CMITS: r.CMITS, REELE_GBN_NM: r.REELE_GBN_NM,
  }),
};
