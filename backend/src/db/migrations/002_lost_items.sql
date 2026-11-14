-- 분실물 검색 조건 (메인 입력 문장 + 조건 확인 화면에서 정한 조건)
-- id(lostItemId)는 화면 주소(/confirm/:id, /results/:id)에 그대로 쓰여서, 남의 것을 추측할 수 없게 무작위 문자열로 만든다.
-- 대소문자가 다른 id를 같은 것으로 보지 않도록 ascii_bin
CREATE TABLE lost_items (
  id          CHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT 'lostItemId (무작위 16자)',
  raw_text    VARCHAR(500) NOT NULL COMMENT '사용자가 입력한 문장',
  extracted   BOOLEAN      NOT NULL COMMENT '문장에서 조건을 뽑았는지 (false → 3b 직접 고르기 화면)',

  -- 검색 조건 (모르면 NULL)
  item_name   VARCHAR(100) NULL COMMENT '물품 (예: 무선이어폰 케이스)',
  prdt_cl_nm  VARCHAR(30)  NULL COMMENT '물품 대분류 (예: 전자기기)',
  prdt_cl_cd  VARCHAR(10)  NULL COMMENT '경찰청 대분류 코드 (예: PRG000). prdt_cl_nm에서 계산',
  clr_nm      VARCHAR(10)  NULL COMMENT '색 계열 (예: 검정)',
  region      VARCHAR(10)  NULL COMMENT '지역 (예: 서울)',
  lct_cd      VARCHAR(10)  NULL COMMENT '경찰청 지역 코드 (예: LCA000). region에서 계산',
  date_from   DATE         NULL COMMENT '분실 날짜 시작',
  date_to     DATE         NULL COMMENT '분실 날짜 끝',
  brand       VARCHAR(50)  NULL COMMENT '브랜드 (API 필드 없음 → 물품명 키워드 매칭용)',
  feature     VARCHAR(200) NULL COMMENT '특징 (API 필드 없음 → 물품명 키워드 매칭용)',

  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '분실물 검색 조건';
