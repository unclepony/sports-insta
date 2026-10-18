# 데이터 출처 메모

## 열린국회정보 Open API
- 주소: `https://open.assembly.go.kr/portal/openapi/<데이터셋 코드>?KEY=&Type=json&pIndex=1&pSize=100`
- **인증키 없으면(KEY 빈 값) 데이터셋마다 5건만** 내려온다 → `SAMPLE_MODE`, 카드에 "샘플 데이터 미리보기" 표시.
  인증키는 open.assembly.go.kr 회원가입 후 발급(무료) → GitHub Secrets `ASSEMBLY_API_KEY`.
- 잘못된 키는 `ERROR-290`, 필수 인자 누락은 `ERROR-300`, 데이터 없음은 `INFO-200`.

| 이름 | 코드 | 쓰는 필드 | 비고 |
|---|---|---|---|
| 국회의원 발의법률안 | `nzmimeepazxkubdpn` | BILL_ID, BILL_NO, BILL_NAME, PROPOSE_DT, PROPOSER, RST_PROPOSER, RST_MONA_CD, COMMITTEE, PROC_RESULT | `AGE=22` 필수. 최신 발의순. 22대 누적 약 2만 건 |
| 본회의 처리안건(법률안) | `ncocpgfiaoituanbr` | BILL_ID, BILL_NAME, PROC_DT, PROC_RESULT_CD, MEMBER_TCNT(재적), VOTE_TCNT(재석), YES/NO/BLANK_TCNT | `AGE=22`. 정당별·의원별 표결은 아님 |
| 국회의원 인적사항 | `nwvrqwxyaytdsfvhu` | MONA_CD, HG_NM, POLY_NM, ORIG_NM(지역구), ELECT_GBN_NM, CMITS, REELE_GBN_NM | 299명. 연락처·보좌진·생년월일은 **저장하지 않는다** |
| 의안별 표결현황(의원별) | `nojepdqqaweusdfbi` | (다음 단계) | `BILL_ID`·`AGE` 필수 → 본회의 처리안건의 BILL_ID 로 조회해 정당별 찬반 집계 예정 |

- 발의 법안 데이터에서 COMMITTEE 는 회부 전이면 null → 카드에서 행을 생략한다(추측해서 채우지 않음).
- 원본은 `data/raw/<날짜>/` 에 그대로 저장, 게시 전 검증은 이 파일과 대조한다.
