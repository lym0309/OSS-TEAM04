import { describe, expect, it } from 'vitest'
import { CATEGORIES, REGIONS, colorDisplayName, findCategory, majorCategory } from '../src/shared/codes.js'

describe('코드표', () => {
  it('분류·지역 코드와 이름이 겹치지 않는다', () => {
    for (const list of [CATEGORIES, REGIONS]) {
      expect(new Set(list.map((c) => c.code)).size).toBe(list.length)
      expect(new Set(list.map((c) => c.name)).size).toBe(list.length)
    }
  })

  it('majorCategory: "대분류 > 소분류"에서 대분류만', () => {
    expect(majorCategory('지갑 > 여성용 지갑')).toBe('지갑')
    expect(majorCategory('현금')).toBe('현금')
    expect(majorCategory()).toBe('')
  })

  it('findCategory: 이름으로 코드 찾기', () => {
    expect(findCategory('가방')?.code).toBe('PRA000')
    expect(findCategory('없는 분류')).toBeUndefined()
  })

  it('colorDisplayName: 괄호 안 표기만', () => {
    expect(colorDisplayName('블랙(검정)')).toBe('검정')
    expect(colorDisplayName('코발트(짙은청록)')).toBe('짙은청록')
    expect(colorDisplayName('기타')).toBe('기타')
  })
})
