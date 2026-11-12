/**
 * 경찰청 습득물 API 코드표 (화면 드롭다운·썸네일용)
 *
 * ⚠️ 백엔드에도 같은 코드표가 있다 (backend/src/rules/). 값을 바꾸면 양쪽을 같이 바꿀 것.
 * 분류·지역 코드는 실제 API 응답으로 확인한 값 (#13 참고).
 */

/**
 * 물품 대분류 (PRDT_CL_CD_01)
 * - name: prdtClNm의 ">" 앞 대분류와 같은 이름
 * - emoji: 썸네일 대분류 이미지 (시안은 이모지로 대신 표시, 실제 이미지로 교체 예정)
 *   emoji가 없는 분류는 썸네일에서 📦 "기타"로 표시된다.
 */
export const CATEGORIES = [
  { name: '가방', code: 'PRA000', emoji: '👜' },
  { name: '도서용품', code: 'PRB000', emoji: '📚' },
  { name: '서류', code: 'PRC000', emoji: '📄' },
  { name: '산업용품', code: 'PRD000' },
  { name: '스포츠용품', code: 'PRE000', emoji: '⚽' },
  { name: '자동차', code: 'PRF000', emoji: '🚗' },
  { name: '전자기기', code: 'PRG000', emoji: '🎧' },
  { name: '지갑', code: 'PRH000', emoji: '👛' },
  { name: '컴퓨터', code: 'PRI000', emoji: '💻' },
  { name: '휴대폰', code: 'PRJ000', emoji: '📱' },
  { name: '의류', code: 'PRK000', emoji: '👕' },
  { name: '현금', code: 'PRL000', emoji: '💵' },
  { name: '유가증권', code: 'PRM000' },
  { name: '증명서', code: 'PRN000', emoji: '🪪' },
  { name: '귀금속', code: 'PRO000', emoji: '💍' },
  { name: '카드', code: 'PRP000', emoji: '💳' },
  { name: '쇼핑백', code: 'PRQ000', emoji: '🛍️' },
  { name: '악기', code: 'PRR000', emoji: '🎸' },
  { name: '유류품', code: 'PRX000' },
  { name: '무주물', code: 'PRY000' },
  { name: '기타물품', code: 'PRZ000' },
]

/** 습득 지역 (N_FD_LCT_CD), 시·도 단위 */
export const REGIONS = [
  { name: '서울', code: 'LCA000' },
  { name: '부산', code: 'LCT000' },
  { name: '대구', code: 'LCR000' },
  { name: '인천', code: 'LCV000' },
  { name: '광주', code: 'LCQ000' },
  { name: '대전', code: 'LCS000' },
  { name: '울산', code: 'LCU000' },
  { name: '세종', code: 'LCW000' },
  { name: '경기', code: 'LCI000' },
  { name: '강원', code: 'LCH000' },
  { name: '충북', code: 'LCO000' },
  { name: '충남', code: 'LCN000' },
  { name: '전북', code: 'LCM000' },
  { name: '전남', code: 'LCL000' },
  { name: '경북', code: 'LCK000' },
  { name: '경남', code: 'LCJ000' },
  { name: '제주', code: 'LCP000' },
]

/**
 * 색 계열 (경찰청 색상명 50여 종을 묶은 것)
 * 경찰청 색상 코드는 같은 색이 여러 코드에 흩어져 있어, 화면에서는 계열 이름으로 고른다.
 */
export const COLOR_FAMILIES = [
  '검정', '흰색', '회색', '은색', '갈색', '빨강', '주황', '노랑',
  '초록', '청록', '파랑', '남색', '보라', '분홍', '기타',
]

/** 조회 기간 (일, 오늘 포함) */
export const PERIODS = [3, 7, 30]
export const DEFAULT_PERIOD = 7

/** 드롭다운의 "잘 모르겠어요" 선택지 값 (조건 확인 실패 화면 3b) */
export const UNKNOWN = ''

/** "지갑 > 여성용 지갑" → "지갑" */
export const majorCategory = (prdtClNm = '') => prdtClNm.split('>')[0].trim()

export const findCategory = (name) => CATEGORIES.find((c) => c.name === name)
export const findRegion = (name) => REGIONS.find((r) => r.name === name)

/** "블랙(검정)" → "검정" (문구 규칙표: 괄호 안 표기만 쓴다) */
export function colorDisplayName(clrNm = '') {
  const inner = clrNm.match(/\(([^)]+)\)/)
  return (inner ? inner[1] : clrNm).trim()
}
