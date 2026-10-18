# 사장님이 직접 하셔야 하는 일 (한 번만)

계정 만들기·로그인·토큰 발급과 입력은 제가 대신할 수 없는 일이라 이 3가지만 남겼습니다.
GitHub 저장소 만들기·코드 올리기·운영 보고 키·암호화 키·미디어 공개 주소(GitHub Pages)는 제가 합니다.
토큰 값은 채팅에 붙여 넣지 말고 GitHub 화면에만 넣어 주세요.

## 1. 인스타그램 계정 만들기
1. 인스타그램 앱에서 새 계정 만들기
   - 이름: **ATL골프기어** (유튜브 채널·사이트와 같은 이름 — 다른 이름을 원하시면 알려 주세요), 아이디 예: `atl_golfgear`
   - 가입 메일: golfpricedev@gmail.com 권장
2. 설정 → 계정 유형 및 도구 → **프로페셔널 계정으로 전환** → 크리에이터, 카테고리 '스포츠'
3. 프로필 편집 → 링크 추가 → 아래 주소를 그대로 붙여 넣기
   `https://golfprice.unclepony.com/?utm_source=instagram&utm_medium=social&utm_campaign=profile`
4. 소개 글 예: `골프용품 비교 · 쿠팡 판매가 · PGA·LPGA 한국 선수 기록 | 쿠팡 파트너스 활동으로 수수료를 받을 수 있습니다`
5. 아이디를 저에게 알려 주세요(카드·보고서에 씁니다).

## 2. Meta 개발자 앱에서 토큰 받기
1. https://developers.facebook.com 로그인 → 내 앱 → **앱 만들기**
2. 사용 사례: **Instagram API 관리(Instagram 로그인 방식)** 선택
3. 앱 대시보드 → Instagram → API 설정 → **Instagram 계정 추가** → 1번 계정으로 로그인해 권한 허용
   (`instagram_business_basic`, `instagram_business_content_publish`, `instagram_business_manage_insights`, `instagram_business_manage_comments`)
4. 같은 화면에서 **액세스 토큰 생성** → 나오는 **토큰**과 **Instagram 사용자 ID(숫자)** 를 3번에서 씁니다
   - 사장님 계정만 쓰니 앱 심사 없이 개발 모드 그대로 됩니다. 토큰은 이후 매주 자동 연장됩니다.

## 3. GitHub 에 토큰 넣기 (제가 저장소를 만든 뒤)
https://github.com/unclepony/sports-insta/settings/secrets/actions → **New repository secret** 두 번
- 이름 `IG_USER_ID` ← 사용자 ID(숫자)
- 이름 `IG_ACCESS_TOKEN` ← 토큰

끝나면 "넣었어" 라고만 말씀해 주세요. 제가 게시 없이 한 번 돌려 보고(dry run), 이상 없으면 다음 날 19:30부터 자동 게시됩니다.

## 선택: 쇼츠 재활용
ATL골프기어 쇼츠를 릴스로도 올리려면 유튜브 스튜디오에서 원본을 내려받아 `media/source/<영상ID>.mp4` 로 넣어 주세요.
