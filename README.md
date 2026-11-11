# OSS-TEAM04
오픈소스 소프트웨어 설계 및 실습 Team04의 레포지토리

**자연어 기반 분실물 매칭 서비스** — 분실물의 특징을 자연어로 입력하면 경찰청 습득물 데이터에서 비슷한 물건을 찾아 매칭 점수순으로 보여주는 웹 앱

## 기술 스택
| 영역 | 기술 |
|---|---|
| Frontend | React + Vite (JavaScript), react-router → Vercel |
| Backend | Express 5 (JavaScript), mysql2 → Docker → AWS EC2 |
| DB | MySQL 8.4 |
| Test | Vitest, supertest |
| 외부 API | 경찰청 습득물정보 조회 서비스 (공공데이터포털) |

## 폴더 구조
```
front/      React 앱
backend/    Express API 서버
mysql/      MySQL 설정 (메모리 절약)
docs/       협업 규칙 (CONTRIBUTING.md)
docker-compose.yml
```

## 로컬 실행
**필요:** Node.js 22 이상, Docker

```bash
# 1. 환경변수
cp .env.example .env                  # docker compose 용
cp backend/.env.example backend/.env  # 백엔드 로컬 실행용 (DB 비밀번호를 위와 맞추기)

# 2. DB 실행
docker compose up -d mysql

# 3. 백엔드
cd backend && npm install && npm run dev     # http://localhost:3000

# 4. 프론트 (새 터미널)
cd front && npm install && npm run dev       # http://localhost:5173
```
화면 하단에 **"서버 연결됨 · DB 연결됨"**이 보이면 세팅 완료입니다.

> 3306 포트가 이미 사용 중이면 루트 `.env`의 `DB_HOST_PORT`와 `backend/.env`의 `DB_PORT`를 같은 값(예: 3307)으로 바꾸세요.

### Docker로 백엔드까지 한 번에
```bash
docker compose up -d --build
curl localhost:3000/api/health
```

## 협업 규칙
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
