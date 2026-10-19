# 스레드 연결 — 사장님이 직접 하실 일 (한 번만)

코드·자동 실행·토큰 연장·지표는 다 준비돼 있습니다. 아래 5단계 뒤 GitHub 에 토큰 하나만 넣으시면 됩니다.
토큰은 채팅에 붙여 넣지 마세요.

## 1. 스레드 프로필 만들기
1. 휴대폰에 **Threads** 앱을 설치하고 **@atlgolfgear 인스타그램 계정으로 로그인**합니다(인스타 계정으로 바로 만들어짐).
2. 프로필은 "인스타그램에서 가져오기"로 사진·소개를 그대로 쓰고, **공개 프로필**로 둡니다.
3. 프로필 편집 → 링크에 아래 주소:
   `https://golfprice.unclepony.com/?utm_source=threads&utm_medium=profile`

## 2. 개발자 앱에 Threads 사용 사례 추가
1. https://developers.facebook.com → 내 앱 → **ATL골프기어 자동게시** → 왼쪽 **사용 사례 → 사용 사례 추가**
2. **"Threads API 액세스"** 선택 → 추가
   - 이 앱에 추가가 안 된다고 나오면: **앱 만들기**로 새 앱(이름 예: `ATL골프기어 스레드`)을 만들고 사용 사례에서 "Threads API 액세스"만 고르세요.
3. 그 사용 사례 → **맞춤 설정(권한)** 에서 `threads_basic`, `threads_content_publish`, `threads_manage_insights` 를 **추가**

## 3. 테스터 초대
1. 같은 앱 왼쪽 **앱 역할 → 역할 → 사람 추가 → "Threads 테스터"** → `atlgolfgear` 입력 → 추가

## 4. 초대 수락
- 휴대폰 Threads 앱: **프로필 → ≡(설정) → 계정 → 웹사이트 권한 → 초대** → 앱 초대 **수락**
  (또는 PC 브라우저 threads.com → 설정 → 계정 → 웹사이트 권한 → 초대)

## 5. 토큰 만들기(OAuth 허용)
1. 개발자 앱 → 사용 사례 **Threads API 액세스 → 설정(또는 테스트)** 의 **"사용자 토큰 생성기(User Token Generator)"**
2. atlgolfgear 옆 **"액세스 토큰 생성"** → Threads 로그인·권한 **허용** → 긴 토큰이 나오면 복사(60일짜리, 이후 매주 자동 연장)
3. https://github.com/unclepony/sports-insta/settings/secrets/actions → **New repository secret**
   - Name: `THREADS_ACCESS_TOKEN`
   - Secret: 복사한 토큰

넣으셨으면 "스레드 넣었어" 라고 말씀해 주세요. 게시 없이 연결(@atlgolfgear)을 확인한 뒤 바로 시작합니다.
화면 이름이 다르거나 막히면 캡처를 보여 주세요(토큰 부분은 가리고).
