-- 습득물 (경찰청 API에서 주기적으로 수집해 저장)
-- 경찰서 습득물(police)과 포털기관 습득물(portal: 지하철·공항 등)을 한 테이블에 저장한다.
-- 목록 API 필드는 수집 때 채우고, 상세 API 필드(detail_*)는 상세를 조회했을 때 채운다.
CREATE TABLE found_items (
  atc_id          VARCHAR(30)  NOT NULL COMMENT '관리번호 atcId',
  fd_sn           VARCHAR(10)  NOT NULL COMMENT '습득 순번 fdSn',
  source          ENUM('police', 'portal') NOT NULL COMMENT '출처: 경찰서 / 포털기관',

  -- 목록 API
  fd_prdt_nm      VARCHAR(200) NOT NULL COMMENT '물품명 fdPrdtNm',
  prdt_cl_nm      VARCHAR(100) NOT NULL COMMENT '분류 prdtClNm (예: 지갑 > 여성용 지갑)',
  clr_nm          VARCHAR(50)  NOT NULL COMMENT '색상 clrNm (예: 블랙(검정))',
  fd_ymd          DATE         NOT NULL COMMENT '습득일 fdYmd',
  dep_place       VARCHAR(100) NOT NULL COMMENT '보관장소 depPlace',
  img_url         VARCHAR(300) NOT NULL COMMENT '사진 URL fdFilePathImg',

  -- 수집할 때 계산해 두는 값 (필터·정렬·매칭용)
  category        VARCHAR(30)  NOT NULL COMMENT '대분류 (prdt_cl_nm의 > 앞)',
  color_family    VARCHAR(10)  NOT NULL COMMENT '색 계열 (예: 검정)',
  region          VARCHAR(10)  NULL     COMMENT '습득 지역 (지역 코드별로 수집할 때 채움, 예: 서울)',
  has_photo       BOOLEAN      NOT NULL COMMENT '실제 사진 여부 (img_url에 no_img가 없으면 true)',

  -- 상세 API (상세 조회 후 채움)
  detail_fd_hor     VARCHAR(2)   NULL COMMENT '습득 시각(시) fdHor',
  detail_fd_place   VARCHAR(100) NULL COMMENT '습득 장소 fdPlace (예: 택시)',
  detail_status     VARCHAR(20)  NULL COMMENT '보관 상태 csteSteNm',
  detail_keep_type  VARCHAR(30)  NULL COMMENT '보관 구분 fndKeepOrgnSeNm',
  detail_org_id     VARCHAR(20)  NULL COMMENT '기관 ID orgId',
  detail_org_nm     VARCHAR(100) NULL COMMENT '기관명 orgNm',
  detail_tel        VARCHAR(30)  NULL COMMENT '전화 tel',
  detail_memo       VARCHAR(500) NULL COMMENT '특이사항 (uniq의 "특이사항 :" 뒤)',
  detail_fetched_at DATETIME     NULL COMMENT '상세 조회 시각',

  -- 수집 기록
  first_seen_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '처음 수집한 시각 (신규 후보 판정용)',
  last_seen_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '마지막으로 목록에서 확인한 시각',

  PRIMARY KEY (atc_id, fd_sn),
  INDEX idx_fd_ymd (fd_ymd),
  INDEX idx_first_seen (first_seen_at),
  INDEX idx_filter (category, color_family, region, fd_ymd)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
  COMMENT = '경찰청 습득물 (경찰서 + 포털기관)';
