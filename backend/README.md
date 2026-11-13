# backend

Express 5 (JavaScript, ESM) · MySQL 8 (mysql2) · Vitest + supertest

## 실행
```bash
cp .env.example .env       # DB_PASSWORD 등은 루트 .env와 맞추기
npm install
npm run migrate            # DB 테이블 최신화 (pull 받은 뒤 한 번씩)
npm run dev                # http://localhost:3000 (파일 변경 시 자동 재시작)
npm test                   # 테스트
```
DB는 루트에서 `docker compose up -d mysql`로 띄웁니다.

## 구조
```
src/
├─ app.js            # Express 앱 생성 (테스트에서 의존성 주입 가능)
├─ server.js         # 서버 시작, 종료 처리
├─ config/env.js     # 환경변수 (process.env 대신 이걸 사용)
├─ db/
│  ├─ pool.js        # mysql2 커넥션 풀
│  ├─ migrate.js     # 마이그레이션 실행기 (npm run migrate)
│  ├─ migrations/    # 테이블 변경 SQL (001_*.sql, 002_*.sql ...)
│  └─ init/*.sql     # MySQL 컨테이너 최초 생성 시 실행 (DB 기본 설정만)
├─ middlewares/      # 404, 에러 처리
├─ routes/           # /api 라우터
├─ services/         # 경찰청 API, 수집, LLM (예정)
└─ rules/            # 계산 규칙 (순수 함수 + 단위 테스트)
test/
```

## DB 마이그레이션
Prisma 같은 ORM 없이 **번호 붙은 SQL 파일**로 테이블 변경을 관리합니다.

```bash
npm run migrate    # 아직 실행 안 된 파일만 번호순으로 실행
```
- 실행 기록은 DB의 `schema_migrations` 테이블에 남아요. 이미 실행된 파일은 건너뜁니다.
- Docker(`docker compose up`)로 띄우면 서버 시작 전에 자동으로 실행돼요.

### 테이블을 추가·변경하려면
1. `src/db/migrations/`에 **다음 번호**로 새 파일을 만든다. 예: `002_lost_items.sql`
   - 이름 규칙: `숫자3자리_소문자_설명.sql`
2. `npm run migrate`로 내 DB에 적용해 보고, PR에 함께 올린다.

### ⚠️ 규칙
- **이미 머지된 마이그레이션 파일은 절대 고치지 않는다.** 컬럼을 바꾸려면 `ALTER TABLE`이 든 새 파일을 추가한다.
  (실행된 파일이 바뀌면 체크섬이 달라져 `npm run migrate`가 오류를 냅니다)
- 같은 번호를 두 사람이 동시에 쓰면 오류가 나요. PR 머지 순서에 맞춰 번호를 조정하세요.
- 로컬 DB를 처음부터 다시 만들고 싶으면: `docker compose down -v && docker compose up -d mysql && npm run migrate`

### 테이블
| 테이블 | 파일 | 설명 |
|---|---|---|
| `found_items` | `001_found_items.sql` | 경찰청 습득물 (경찰서 + 포털기관). 목록 필드 + 수집 시 계산값(대분류·색 계열·지역·사진 여부) + 상세 필드(`detail_*`) |
| `lost_items` | `002_lost_items.sql` | 분실물 검색 조건 (입력 문장 + 조건 확인 화면에서 정한 조건). `id` = lostItemId (무작위 16자) |
| `schema_migrations` | (자동 생성) | 마이그레이션 실행 기록 |

## API
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/health` | 서버·DB 상태 (`200 {status:"ok", db:"ok"}` / DB 실패 시 `503`) |
| GET | `/api/found-items` | 전체 습득물 (아래 참고) |
| GET | `/api/found-items/filters` | 전체 습득물 필터 선택지 `{ categories, colors, regions, periods, defaultPeriod }` |
| POST | `/api/lost-items` | 분실물 등록 (아래 참고) |
| GET | `/api/lost-items/:id` | 저장된 검색 조건 |
| PATCH | `/api/lost-items/:id` | 검색 조건 수정 |

### 분실물 `/api/lost-items`
- `POST { rawText }` → `201` 검색 조건. `rawText`는 공백 제외 5자 이상, 500자 이하
  - `extracted: true`면 조건 확인(3a), `false`면 직접 고르기(3b). **조건 추출(Gemini) 연결 전까지는 항상 `false`**
- `PATCH { itemName?, prdtClNm?, clrNm?, region?, dateFrom?, dateTo?, brand?, feature? }` → 보낸 필드만 바꿈. `null`·`""`이면 지움
  - `prdtClNm`·`clrNm`·`region`은 `/api/found-items/filters`의 값만 가능. 날짜는 `YYYY-MM-DD`, 시작 ≤ 끝 ≤ 오늘
  - 경찰청 코드(`prdtClCd`, `lctCd`)는 서버가 이름으로 계산 (보내도 무시)
- 응답 (POST·GET·PATCH 공통, 모르는 값은 `null`)
  ```json
  { "lostItemId": "nyMw1pywIlWaR12w", "rawText": "어제 2호선에서 검정 에어팟 케이스", "extracted": false,
    "itemName": "에어팟 프로 케이스", "prdtClNm": "전자기기", "prdtClCd": "PRG000", "clrNm": "검정",
    "region": "서울", "lctCd": "LCA000", "dateFrom": "2026-11-13", "dateTo": "2026-11-13", "brand": null, "feature": null }
  ```
- 오류: `400 { error: { message } }` (화면에 그대로 보여줘도 되는 문구), 없는 id는 `404`

### `GET /api/found-items?q=&cat=&clr=&region=&period=&page=`
경찰청 습득물(경찰관서 + 포털기관) 목록. 점수 계산 없이 최신 접수순(`atcId`의 접수일 기준), 페이지당 8건.

| 쿼리 | 값 | 기본 |
|---|---|---|
| `q` | 물품명·분류명 검색어 (50자 이하) | 전체 |
| `cat` | 대분류 이름 (예: `지갑`) | 전체 |
| `clr` | 색 계열 (예: `검정`, `흰색`) | 전체 |
| `region` | 시·도 (예: `서울`) | 전체 |
| `period` | `3` · `7` · `30` (일, 오늘 포함) | `7` |
| `page` | 1~625 | `1` |

응답: `{ items, totalCount, page, pageSize, totalPages }`. `items`는 경찰청 필드명 그대로 (`atcId, fdSn, fdPrdtNm, prdtClNm, clrNm, fdYmd, depPlace, fdFilePathImg`) + `isNew`(최근 3일).
잘못된 쿼리는 `400`, 경찰청 API 오류는 `502`.

- 경찰청 API는 검색어·색상 필터를 지원하지 않아, `q`·`clr`가 있으면 기간 내 전체를 받아 서버에서 거릅니다. 메모리(192MB) 때문에 한 페이지씩 받아 처음 요청은 느리고(7일 약 10초, 30일 약 50초) 같은 조건은 10분간 캐시됩니다.
- 포털기관 API는 접수순이 아니라 기관번호순으로 줘서, `q`·`clr`가 없는 기본 목록에서는 포털기관 항목 순서가 대략적입니다 (검색 시에는 정확). 습득물 DB 수집(#16) 후 해결 예정입니다.
- 넘겨 볼 수 있는 건 앞 5,000건(625페이지)까지이고, `totalCount`는 실제 건수입니다.

에러 응답 형식: `{ "error": { "message": "..." } }`
