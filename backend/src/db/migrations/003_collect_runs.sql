-- 수집기용 컬럼·테이블

-- 목록에서 사라진 습득물 표시 (주인이 찾아감, 보관 기관 이관 등)
-- 30일 전체 수집에서 안 보이면 채우고, 다시 보이면 NULL로 되돌린다. 화면에서는 gone_at IS NULL만 보여준다
ALTER TABLE found_items
  ADD COLUMN gone_at DATETIME NULL COMMENT '목록에서 사라진 것을 확인한 시각. NULL이면 보관 중' AFTER last_seen_at;

-- 수집 기록. 다음 수집을 최근 며칠만 할지 전체를 할지, 서버를 다시 켰을 때 바로 수집할지 정하는 데 쓴다
CREATE TABLE collect_runs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mode         ENUM('full', 'recent') NOT NULL COMMENT 'full: 최근 COLLECT_DAYS일 전체 / recent: 최근 COLLECT_RECENT_DAYS일',
  days         TINYINT UNSIGNED NOT NULL COMMENT '수집한 기간 (일)',
  started_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at  DATETIME NULL COMMENT 'NULL이면 진행 중이거나 중간에 멈춤',
  ok           BOOLEAN  NULL COMMENT '모든 출처가 성공했는지',
  result       JSON     NULL COMMENT '출처별 결과 (건수, 새 습득물, 사라진 습득물 등)',
  PRIMARY KEY (id),
  INDEX idx_mode_started (mode, started_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '습득물 수집 기록';
