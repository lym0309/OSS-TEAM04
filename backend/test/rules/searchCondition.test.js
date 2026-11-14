import { describe, expect, it } from 'vitest'
import {
  dateRangeError,
  isSearchable,
  rawTextError,
  sanitizeCondition,
  withCodes,
} from '../../src/rules/searchCondition.js'

describe('rawTextError', () => {
  it('공백 제외 5자 이상, 500자 이하면 통과', () => {
    expect(rawTextError('버스 지갑요')).toBeNull()
    expect(rawTextError('가'.repeat(500))).toBeNull()
  })

  it('짧거나 길거나 문자열이 아니면 안내 문구', () => {
    expect(rawTextError('지 갑 요')).toMatch('5자 이상') // 공백 빼면 3자
    expect(rawTextError('     ')).toMatch('5자 이상')
    expect(rawTextError('가'.repeat(501))).toMatch('500자 이하')
    expect(rawTextError(undefined)).toMatch('입력해 주세요')
    expect(rawTextError(123)).toMatch('입력해 주세요')
  })

  it('앞뒤 공백은 길이에서 뺀다', () => {
    expect(rawTextError(`  ${'가'.repeat(500)}  `)).toBeNull()
  })
})

describe('sanitizeCondition', () => {
  it('들어온 필드만 정리하고, 앞뒤 공백을 지운다', () => {
    expect(sanitizeCondition({ itemName: ' 에어팟 케이스 ', clrNm: '검정' })).toEqual({
      values: { itemName: '에어팟 케이스', clrNm: '검정' },
      errors: [],
    })
  })

  it('null·빈 문자열은 지우기(null)', () => {
    expect(sanitizeCondition({ brand: null, region: '', feature: '   ' }).values).toEqual({
      brand: null,
      region: null,
      feature: null,
    })
  })

  it('코드표에 없는 분류·색상·지역, 잘못된 날짜는 오류로 빼낸다', () => {
    const { values, errors } = sanitizeCondition({
      prdtClNm: '우주선',
      clrNm: '무지개',
      region: '평양',
      dateFrom: '2026-02-30',
      itemName: '지갑',
    })
    expect(values).toEqual({ itemName: '지갑' })
    expect(errors).toHaveLength(4)
  })

  it('코드(prdtClCd·lctCd)나 모르는 필드는 받지 않는다', () => {
    expect(sanitizeCondition({ prdtClCd: 'PRA000', lctCd: 'LCA000', rawText: 'x', hack: 1 }).values).toEqual({})
  })

  it('문자열이 아니면 오류, 너무 길면 오류', () => {
    expect(sanitizeCondition({ itemName: 3 }).errors[0]).toMatch('문자열')
    expect(sanitizeCondition({ brand: 'a'.repeat(51) }).errors[0]).toMatch('50자 이하')
  })

  it('객체가 아니면 빈 결과', () => {
    expect(sanitizeCondition(null)).toEqual({ values: {}, errors: [] })
    expect(sanitizeCondition('text')).toEqual({ values: {}, errors: [] })
  })
})

describe('dateRangeError', () => {
  const today = '2026-11-14'
  it('시작 ≤ 끝 ≤ 오늘이면 통과, 한쪽만 있어도 통과', () => {
    expect(dateRangeError({ dateFrom: '2026-11-12', dateTo: '2026-11-14' }, today)).toBeNull()
    expect(dateRangeError({ dateFrom: '2026-11-12', dateTo: null }, today)).toBeNull()
    expect(dateRangeError({}, today)).toBeNull()
  })

  it('시작이 끝보다 늦거나, 오늘 이후면 안내 문구', () => {
    expect(dateRangeError({ dateFrom: '2026-11-13', dateTo: '2026-11-12' }, today)).toMatch('늦어요')
    expect(dateRangeError({ dateFrom: '2026-11-12', dateTo: '2026-11-15' }, today)).toMatch('오늘 이후')
  })
})

describe('withCodes', () => {
  it('분류·지역 이름 → 경찰청 코드', () => {
    expect(withCodes({ prdtClNm: '지갑', region: '서울' })).toMatchObject({ prdtClCd: 'PRH000', lctCd: 'LCA000' })
  })

  it('이름이 없으면 코드도 null', () => {
    expect(withCodes({ prdtClNm: null, region: null })).toMatchObject({ prdtClCd: null, lctCd: null })
  })
})

describe('isSearchable', () => {
  it('물품(이름 또는 분류) + 날짜 범위가 있어야 바로 검색', () => {
    expect(isSearchable({ itemName: '지갑', dateFrom: '2026-11-12', dateTo: '2026-11-12' })).toBe(true)
    expect(isSearchable({ prdtClNm: '지갑', dateFrom: '2026-11-12', dateTo: '2026-11-12' })).toBe(true)
    expect(isSearchable({ itemName: '지갑', dateFrom: '2026-11-12' })).toBe(false)
    expect(isSearchable({ dateFrom: '2026-11-12', dateTo: '2026-11-12' })).toBe(false)
  })
})
