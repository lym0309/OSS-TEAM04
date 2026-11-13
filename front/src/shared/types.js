/**
 * 공유 데이터 형태 (디자인 핸드오프 "공유 계약")
 * 세 명 모두 이 형태를 기준으로 API 응답·화면 props를 맞춘다.
 * TypeScript 대신 JSDoc으로 정의 — 에디터(VS Code)에서 자동완성·타입 힌트가 동작한다.
 *
 * 사용 예:
 *   /** @param {import('../shared/types.js').MatchResult} item *\/
 *   export default function ResultCard({ item }) { ... }
 */

/**
 * 분실물 검색 조건 (POST·GET·PATCH /api/lost-items 응답)
 * 모르는 값은 null. 수정은 PATCH로 바꿀 필드만 보낸다 (null이면 지움, 코드는 서버가 계산)
 * @typedef {Object} SearchCondition
 * @property {string} lostItemId        분실물 ID (화면 사이에는 이것만 넘긴다)
 * @property {string} rawText           사용자가 입력한 원문
 * @property {boolean} extracted        문장에서 조건을 뽑았는지 (true → 3a 조건 확인, false → 3b 직접 고르기)
 * @property {string|null} itemName     물품 (예: 무선이어폰 케이스)
 * @property {string|null} prdtClNm     물품 대분류 (예: 전자기기, codes.js CATEGORIES의 name)
 * @property {string|null} prdtClCd     경찰청 대분류 코드 (예: PRG000) — 서버가 계산
 * @property {string|null} clrNm        색 계열 (예: 검정, codes.js COLOR_FAMILIES)
 * @property {string|null} region       지역 (예: 서울, codes.js REGIONS의 name)
 * @property {string|null} lctCd        경찰청 지역 코드 (예: LCA000) — 서버가 계산
 * @property {string|null} dateFrom     분실 날짜 시작 YYYY-MM-DD
 * @property {string|null} dateTo       분실 날짜 끝 YYYY-MM-DD (시작 ≤ 끝 ≤ 오늘)
 * @property {string|null} brand        브랜드 (API 필드 없음 → 텍스트 키워드 매칭)
 * @property {string|null} feature      특징 (API 필드 없음 → 텍스트 키워드 매칭)
 */

/**
 * 조건별 일치 점수
 * @typedef {Object} MatchTag
 * @property {'category'|'color'|'date'|'region'} key
 * @property {number} score   0~100 (80↑ 일치, 50~79 부분 일치, 50↓ 불일치)
 */

/**
 * 매칭 결과 한 건 (GET /api/lost-items/:id/results)
 * 필드명은 경찰청 API 그대로 쓴다.
 * @typedef {Object} MatchResult
 * @property {string} atcId           관리번호
 * @property {string} fdSn            습득 순번
 * @property {string} fdPrdtNm        물품명
 * @property {string} prdtClNm        분류 (예: 전자기기 > 무선이어폰)
 * @property {string} clrNm           색상 (예: 블랙(검정))
 * @property {string} fdYmd           습득일 YYYY-MM-DD
 * @property {string} depPlace        보관장소
 * @property {string} fdFilePathImg   사진 URL ("no_img" 포함 시 사진 없음)
 * @property {number} score           종합 점수 0~100
 * @property {MatchTag[]} tags        조건별 점수
 * @property {boolean} isNew          NEW 배지 표시 여부
 */

export {}
