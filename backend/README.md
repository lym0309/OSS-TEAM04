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
| `schema_migrations` | (자동 생성) | 마이그레이션 실행 기록 |

## API
| Method | Path | 설명 |
|---|---|---|
| GET | `/api/health` | 서버·DB 상태 (`200 {status:"ok", db:"ok"}` / DB 실패 시 `503`) |

에러 응답 형식: `{ "error": { "message": "..." } }`
