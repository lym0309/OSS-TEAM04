-- MySQL 컨테이너가 처음 생성될 때 한 번 실행됨 (/docker-entrypoint-initdb.d)
-- 여기에는 DB 기본 설정만 둔다.
-- ⚠️ 테이블은 여기에 추가하지 말고 src/db/migrations/ 에 추가할 것 (npm run migrate)

ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
