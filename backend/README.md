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

에러 응답 형식: `{ "error": { "message": "..." } }`
