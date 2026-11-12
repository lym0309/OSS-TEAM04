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
 * 분실물 검색 조건 (POST /api/lost-items 응답, PATCH /api/lost-items/:id 요청)
 * @typedef {Object} SearchCondition
 * @property {string} lostItemId      분실물 ID (화면 사이에는 이것만 넘긴다)
 * @property {string} rawText         사용자가 입력한 원문
 * @property {string} itemName        물품 (예: 무선이어폰 케이스)
 * @property {string} [prdtClCd]      경찰청 물품 대분류 코드 (예: PRG000)
 * @property {string} [prdtClNm]      경찰청 물품 분류명 (예: 전자기기)
 * @property {string} [clrCd]         경찰청 색상 코드
 * @property {string} [clrNm]         색상 (예: 검정)
 * @property {string} [region]        지역명 (예: 서울)
 * @property {string} [lctCd]         경찰청 지역 코드 (예: LCA000)
 * @property {string} dateFrom        분실 날짜 시작 YYYY-MM-DD
 * @property {string} dateTo          분실 날짜 끝 YYYY-MM-DD
 * @property {string} [brand]         브랜드 (API 필드 없음 → 텍스트 키워드 매칭)
 * @property {string} [feature]       특징 (API 필드 없음 → 텍스트 키워드 매칭)
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
