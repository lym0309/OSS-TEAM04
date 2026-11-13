// 분실물 검색 조건 계산 규칙 (순수 함수)
// - 입력 문장 검증
// - 조건 값 검증 (PATCH 요청, LLM 추출 결과 모두 같은 규칙으로)
// - 이름 → 경찰청 코드 변환
import { COLOR_FAMILIES } from './colors.js'
import { CATEGORIES, categoryCode, regionCode, REGIONS } from './foundItemCodes.js'

// 실제로 있는 날짜인지 (YYYY-MM-DD). 2026-02-30 같은 값은 false
const isValidYmd = (ymd) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false
  const date = new Date(`${ymd}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === ymd
}

export const RAW_TEXT_MIN = 5 // 공백 제외
export const RAW_TEXT_MAX = 500

/** 입력 문장 검증. 문제가 있으면 안내 문구, 없으면 null */
export function rawTextError(rawText) {
  if (typeof rawText !== 'string') return '분실물 설명(rawText)을 입력해 주세요.'
  if (rawText.replace(/\s/g, '').length < RAW_TEXT_MIN) return `공백을 빼고 ${RAW_TEXT_MIN}자 이상 입력해 주세요.`
  if (rawText.trim().length > RAW_TEXT_MAX) return `${RAW_TEXT_MAX}자 이하로 입력해 주세요.`
  return null
}

const categoryNames = CATEGORIES.map((c) => c.name)
const regionNames = REGIONS.map((r) => r.name)

const textRule = (label, max) => (v) => (v.length <= max ? null : `${label}은(는) ${max}자 이하로 입력해 주세요.`)
const oneOf = (label, list) => (v) => (list.includes(v) ? null : `알 수 없는 ${label}입니다: ${v}`)
const dateRule = (label) => (v) => (isValidYmd(v) ? null : `${label}는 YYYY-MM-DD 형식이어야 합니다.`)

// 사용자가 정할 수 있는 조건과 규칙 (이름은 공유 계약 SearchCondition과 같음)
// 코드(prdtClCd, lctCd)는 받지 않고 서버에서 이름으로 계산한다
const FIELD_RULES = {
  itemName: textRule('물품', 100),
  prdtClNm: oneOf('물품 분류', categoryNames),
  clrNm: oneOf('색상', COLOR_FAMILIES),
  region: oneOf('지역', regionNames),
  dateFrom: dateRule('시작 날짜'),
  dateTo: dateRule('끝 날짜'),
  brand: textRule('브랜드', 50),
  feature: textRule('특징', 200),
}
export const CONDITION_FIELDS = Object.keys(FIELD_RULES)

/**
 * 조건 값 정리. 들어온 필드만 다루고, null·빈 문자열은 "지우기"(null)로 본다.
 * @returns {{ values: object, errors: string[] }}  errors가 있는 필드는 values에서 빠진다
 */
export function sanitizeCondition(input) {
  const values = {}
  const errors = []
  if (!input || typeof input !== 'object') return { values, errors }
  for (const field of CONDITION_FIELDS) {
    if (!(field in input)) continue
    const raw = input[field]
    if (raw === null || raw === '') {
      values[field] = null
      continue
    }
    if (typeof raw !== 'string') {
      errors.push(`${field} 값은 문자열이어야 합니다.`)
      continue
    }
    const value = raw.trim()
    if (value === '') {
      values[field] = null
      continue
    }
    const error = FIELD_RULES[field](value)
    if (error) errors.push(error)
    else values[field] = value
  }
  return { values, errors }
}

/** 날짜 범위 검사. 문제가 있으면 안내 문구 */
export function dateRangeError({ dateFrom, dateTo }, today) {
  if (dateFrom && dateTo && dateFrom > dateTo) return '시작 날짜가 끝 날짜보다 늦어요.'
  if ((dateFrom && dateFrom > today) || (dateTo && dateTo > today)) return '오늘 이후 날짜는 고를 수 없어요.'
  return null
}

/** 이름 → 경찰청 코드 (모르는 이름이면 null) */
export function withCodes(condition) {
  return {
    ...condition,
    prdtClCd: (condition.prdtClNm && categoryCode(condition.prdtClNm)) || null,
    lctCd: (condition.region && regionCode(condition.region)) || null,
  }
}

/** 바로 검색할 수 있는 조건인지 (물품 + 날짜). 아니면 3b 화면에서 직접 고르게 한다 */
export function isSearchable({ itemName, prdtClNm, dateFrom, dateTo }) {
  return Boolean((itemName || prdtClNm) && dateFrom && dateTo)
}

/** 모든 조건이 비어 있는 상태 */
export const EMPTY_CONDITION = Object.fromEntries(CONDITION_FIELDS.map((f) => [f, null]))
