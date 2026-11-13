// 경찰청 습득물 API 코드표
// 2026-11 실제 API 응답으로 코드 ↔ 이름 대응을 확인함 (코드로 조회 → 응답의 prdtClNm·depPlace 확인)

// 물품 대분류 (PRDT_CL_CD_01). 이름은 prdtClNm의 ">" 앞 대분류와 같다
export const CATEGORIES = [
  { name: '가방', code: 'PRA000' },
  { name: '도서용품', code: 'PRB000' },
  { name: '서류', code: 'PRC000' },
  { name: '산업용품', code: 'PRD000' },
  { name: '스포츠용품', code: 'PRE000' },
  { name: '자동차', code: 'PRF000' },
  { name: '전자기기', code: 'PRG000' },
  { name: '지갑', code: 'PRH000' },
  { name: '컴퓨터', code: 'PRI000' },
  { name: '휴대폰', code: 'PRJ000' },
  { name: '의류', code: 'PRK000' },
  { name: '현금', code: 'PRL000' },
  { name: '유가증권', code: 'PRM000' },
  { name: '증명서', code: 'PRN000' },
  { name: '귀금속', code: 'PRO000' },
  { name: '카드', code: 'PRP000' },
  { name: '쇼핑백', code: 'PRQ000' },
  { name: '악기', code: 'PRR000' },
  { name: '유류품', code: 'PRX000' },
  { name: '무주물', code: 'PRY000' },
  { name: '기타물품', code: 'PRZ000' },
]

// 습득 지역 (N_FD_LCT_CD). 시·도 단위
// LCE000·LCF000·LCG000은 여러 시·도가 섞여 나와 제외
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

// 조회 기간 (일). 오늘 포함
export const PERIODS = [3, 7, 30]
export const DEFAULT_PERIOD = 7

export const categoryCode = (name) => CATEGORIES.find((c) => c.name === name)?.code
export const regionCode = (name) => REGIONS.find((r) => r.name === name)?.code

// prdtClNm "지갑 > 여성용 지갑" → "지갑"
export const majorCategory = (prdtClNm = '') => prdtClNm.split('>')[0].trim()
