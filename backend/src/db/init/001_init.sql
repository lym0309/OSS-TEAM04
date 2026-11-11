-- MySQL 컨테이너가 처음 생성될 때 한 번 실행됨 (/docker-entrypoint-initdb.d)
-- 이미 만들어진 볼륨에는 다시 실행되지 않으므로, 스키마를 바꾸면
-- `docker compose down -v`로 볼륨을 지우고 다시 띄우거나 별도 마이그레이션 SQL을 실행할 것
-- 테이블 정의는 기능 개발 이슈에서 002_*.sql 부터 추가

ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
