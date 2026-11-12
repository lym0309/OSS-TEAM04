# backend

Express 5 (JavaScript, ESM) · MySQL 8 (mysql2) · Vitest + supertest

## 실행
```bash
cp .env.example .env       # DB_PASSWORD 등은 루트 .env와 맞추기
npm install
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
│  └─ init/*.sql     # MySQL 컨테이너 최초 생성 시 실행
├─ middlewares/      # 404, 에러 처리
├─ routes/           # /api 라우터
├─ services/         # 경찰청 API, 수집, LLM (예정)
└─ rules/            # 계산 규칙 (순수 함수 + 단위 테스트)
test/
```

## API
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/health` | 서버·DB 상태 (`200 {status:"ok", db:"ok"}` / DB 실패 시 `503`) |
| GET | `/api/found-items` | 전체 습득물 (아래 참고) |
| GET | `/api/found-items/filters` | 전체 습득물 필터 선택지 `{ categories, colors, regions, periods, defaultPeriod }` |

### `GET /api/found-items?q=&cat=&clr=&region=&period=&page=`
경찰청 습득물(경찰관서 + 포털기관) 목록. 점수 계산 없이 습득일 최신순, 페이지당 8건.

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

- 경찰청 API는 검색어·색상 필터를 지원하지 않아, `q`·`clr`가 있으면 기간 내 전체를 받아 서버에서 거릅니다. 처음 요청은 느리고(7일 약 10초, 30일 약 25초) 같은 조건은 10분간 캐시됩니다.
- 넘겨 볼 수 있는 건 앞 5,000건(625페이지)까지이고, `totalCount`는 실제 건수입니다.

에러 응답 형식: `{ "error": { "message": "..." } }`
