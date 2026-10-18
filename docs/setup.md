# 사장님 준비 순서 (한 번만)

계정 만들기·로그인·결제는 사장님이 직접 하셔야 합니다. 막히는 화면이 있으면 캡처를 보여 주시면 다음 단계를 안내하겠습니다.
키·토큰 값은 채팅에 붙여 넣지 말고 GitHub Secrets 에만 넣어 주세요.

## 1. 계정 이름 정하기
- 제안: **ATL골프기어** (유튜브 채널·사이트와 같은 이름). 아이디 예: `atl_golfgear`
- 정하면 `config/brand.json` 의 `handle` 에 적습니다(제가).

## 2. 인스타그램 계정
1. 인스타그램 앱에서 새 계정 만들기 (관리자 메일 golfpricedev@gmail.com 권장)
2. 설정 → 계정 유형 및 도구 → **프로페셔널 계정으로 전환** → 크리에이터(또는 비즈니스), 카테고리 '스포츠' 등
3. 프로필 편집 → 링크 추가 → `https://golfprice.unclepony.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile`
   (golfprice 관리 페이지에서 인스타 유입이 따로 보이도록)
4. 프로필 소개 예: "골프용품 비교 · 쿠팡 판매가 · PGA·LPGA 한국 선수 기록 | 쿠팡 파트너스 활동으로 수수료를 받을 수 있습니다"

## 3. Meta 개발자 앱과 토큰
1. https://developers.facebook.com 에 로그인 → 내 앱 → 앱 만들기
2. 사용 사례: **Instagram API 관리 / 메시지 및 콘텐츠 관리**(Instagram API with Instagram Login)
3. 앱 대시보드 → Instagram → API 설정 → **Instagram 계정 추가**(2번 계정으로 로그인해 허용)
   - 권한: `instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`, `instagram_business_manage_comments`
4. 같은 화면에서 **액세스 토큰 생성** → 장기 토큰(60일)과 **Instagram 사용자 ID**(숫자)
   - 사장님 본인 계정만 쓰므로 앱 심사 없이 개발 모드로 시작합니다.
   - 토큰은 매주 자동 연장됩니다(아래 GH_PAT 필요).

## 4. GitHub 저장소와 Secrets
1. GitHub 에 `unclepony/sports-insta` 저장소 만들기(비공개 권장) → 제가 이 폴더를 올립니다.
2. 저장소 → Settings → Secrets and variables → Actions
   - Secrets: `IG_USER_ID`, `IG_ACCESS_TOKEN`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `OPS_URL`, `OPS_KEY`
     (`OPS_*` 는 golf-price 저장소와 같은 값), golf-price 가 비공개면 `GOLF_PRICE_TOKEN`(읽기 권한),
     토큰 자동 연장용 `GH_PAT`(sports-insta 저장소의 Secrets 쓰기 권한이 있는 fine-grained 토큰)
   - Variables: `MEDIA_BASE_URL` = `https://atl-ig-media.pages.dev` (프로젝트 이름을 바꾸면 `MEDIA_PROJECT` 도)

## 5. Cloudflare (미디어 공개 주소)
인스타는 사진·영상을 공개 주소에서 가져갑니다. 매일 그날 미디어만 Cloudflare Pages 에 올립니다(무료).
1. Cloudflare 대시보드 → 내 프로필 → API 토큰 → 토큰 만들기 → 'Cloudflare Pages 편집' 권한 → `CLOUDFLARE_API_TOKEN`
2. 계정 홈 오른쪽의 계정 ID → `CLOUDFLARE_ACCOUNT_ID`
3. Pages 프로젝트 `atl-ig-media` 는 첫 실행 때 자동으로 만들어집니다.

## 6. 첫 실행
1. GitHub → Actions → daily-insta → Run workflow → `dry_run` = `1` → 보고서(reports/daily)와 ops 보고 확인
2. 문제없으면 그다음 날부터 매일 19:30 에 자동 게시
