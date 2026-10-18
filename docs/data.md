# 데이터 출처 메모

## ESPN 골프 (무료, 공식 공개 API 아님)
- 일정: `https://site.api.espn.com/apis/site/v2/sports/golf/{pga|lpga}/scoreboard` → `leagues[0].calendar` (id, label, startDate, endDate)
- 리더보드: `https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league={pga|lpga}&event={id}`
  - `events[0].courses[]`(host, shotsToPar=파, totalYards), `purse`
  - `competitions[0].competitors[]`: `athlete.{id,displayName,flag.alt(국적)}`, `status.position.{displayName(T6), isTie}`,
    `status.type.name`(STATUS_FINISH / STATUS_CUT …), `score.{value(타수), displayValue(+1)}`, `statistics[scoreToPar]`, `linescores[].value`(라운드, 0=없음), `earnings`
- 선수 사진(`athlete.headshot`)·국기 이미지는 **저장·사용하지 않는다**.
- ESPN 은 대회 형식에 상관없이 기권 등도 STATUS_CUT 으로 줄 때가 있어 카드에는 '최종 순위 없음(—)'으로만 표시한다.
- 한국 선수 판별: `flag.alt === 'South Korea'`. 한글 이름은 `config/players-ko.json`(ID 우선).

## golf-price (같은 사업의 사이트 저장소)
- `config/products.json`: categories(id, name, intro, tips), products(id, category, name, summary, points, min, max)
- `config/picks.json`: 상품별 쿠팡 상품 정보 — price(링크 만들 때 확인한 판매가), rocket, checked(확인일)
- 상품 이미지(쿠팡 썸네일)는 쓰지 않는다. 가격은 확인일이 14일(`config/brand.json` staleDays) 이내일 때만.
- `config/videos.json`: ATL골프기어 유튜브 영상 목록 — 쇼츠 재활용(원본 파일은 `media/source/<영상ID>.mp4`)

## 인스타그램 (Instagram API with Instagram Login)
- 게시: `POST /{ig-user-id}/media`(image_url·is_carousel_item / CAROUSEL children / REELS video_url) → 상태 FINISHED 대기 → `POST /{ig-user-id}/media_publish`
- 한도: `GET /{ig-user-id}/content_publishing_limit`
- 지표: `GET /{media-id}/insights?metric=reach|views|saved|shares|total_interactions…`(버전마다 바뀌어 하나씩 시도), 계정 `/{ig-user-id}/insights`
- 토큰: 장기 토큰 60일, `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token`
