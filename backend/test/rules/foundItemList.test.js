import { describe, expect, it } from 'vitest'
import { categoryCode, majorCategory, regionCode } from '../../src/rules/foundItemCodes.js'
import {
  addDays,
  daysBetween,
  isNewItem,
  matchesFilter,
  mergeByLatest,
  periodRange,
  todayKst,
  totalPages,
} from '../../src/rules/foundItemList.js'

describe('날짜 계산', () => {
  it('todayKst는 한국 시간 기준 날짜를 돌려준다', () => {
    // UTC 11/12 15:30 = KST 11/13 00:30
    expect(todayKst(new Date('2026-11-12T15:30:00Z'))).toBe('2026-11-13')
    expect(todayKst(new Date('2026-11-12T14:59:00Z'))).toBe('2026-11-12')
  })

  it('addDays는 월·연도 경계를 넘는다', () => {
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('daysBetween', () => {
    expect(daysBetween('2026-11-10', '2026-11-12')).toBe(2)
    expect(daysBetween('2026-11-12', '2026-11-10')).toBe(-2)
  })

  it('periodRange는 오늘 포함 N일을 YYYYMMDD로', () => {
    expect(periodRange('2026-11-12', 7)).toEqual({ startYmd: '20261106', endYmd: '20261112' })
    expect(periodRange('2026-11-12', 1)).toEqual({ startYmd: '20261112', endYmd: '20261112' })
  })

  it('isNewItem은 오늘 포함 최근 3일', () => {
    expect(isNewItem('2026-11-12', '2026-11-12')).toBe(true)
    expect(isNewItem('2026-11-10', '2026-11-12')).toBe(true)
    expect(isNewItem('2026-11-09', '2026-11-12')).toBe(false)
    expect(isNewItem('2026-11-13', '2026-11-12')).toBe(false) // 미래 날짜는 NEW 아님
  })
})

describe('mergeByLatest', () => {
  const a = [{ id: 'a1', fdYmd: '2026-11-11' }, { id: 'a2', fdYmd: '2026-11-09' }, { id: 'a3', fdYmd: '2026-11-10' }]
  const b = [{ id: 'b1', fdYmd: '2026-11-10' }, { id: 'b2', fdYmd: '2026-11-08' }]

  it('습득일 최신순으로 합치고, 같은 날이면 앞 목록 먼저', () => {
    expect(mergeByLatest([a, b]).map((x) => x.id)).toEqual(['a1', 'b1', 'a2', 'a3', 'b2'])
  })

  it('각 목록 안의 순서는 유지한다', () => {
    const merged = mergeByLatest([a, b]).map((x) => x.id)
    expect(merged.indexOf('a2')).toBeLessThan(merged.indexOf('a3'))
  })

  it('limit만큼만 합치고, 앞부분만 합쳐도 전체 결과의 앞부분과 같다', () => {
    const full = mergeByLatest([a, b])
    expect(mergeByLatest([a, b], 3)).toEqual(full.slice(0, 3))
    expect(mergeByLatest([a.slice(0, 2), b.slice(0, 2)], 2)).toEqual(full.slice(0, 2))
  })

  it('빈 목록', () => {
    expect(mergeByLatest([[], []])).toEqual([])
  })
})

describe('matchesFilter', () => {
  const item = { fdPrdtNm: '에어팟 프로 케이스', prdtClNm: '전자기기 > 무선이어폰', clrNm: '화이트(흰)' }

  it('검색어는 공백·대소문자 무시하고 물품명·분류명에서 찾는다', () => {
    expect(matchesFilter(item, { q: '에어팟프로' })).toBe(true)
    expect(matchesFilter(item, { q: '무선이어폰' })).toBe(true)
    expect(matchesFilter({ ...item, fdPrdtNm: 'AirPods' }, { q: 'airpods' })).toBe(true)
    expect(matchesFilter(item, { q: '지갑' })).toBe(false)
  })

  it('색상은 색 계열로 비교한다', () => {
    expect(matchesFilter(item, { clr: '흰색' })).toBe(true)
    expect(matchesFilter(item, { clr: '검정' })).toBe(false)
  })

  it('조건이 없으면 통과', () => {
    expect(matchesFilter(item, {})).toBe(true)
  })
})

describe('코드표', () => {
  it('이름 → 경찰청 코드', () => {
    expect(categoryCode('지갑')).toBe('PRH000')
    expect(regionCode('서울')).toBe('LCA000')
    expect(categoryCode('없는분류')).toBeUndefined()
    expect(categoryCode('')).toBeUndefined()
  })

  it('majorCategory', () => {
    expect(majorCategory('지갑 > 여성용 지갑')).toBe('지갑')
    expect(majorCategory('')).toBe('')
  })
})

describe('totalPages', () => {
  it('최소 1페이지', () => {
    expect(totalPages(0, 8)).toBe(1)
    expect(totalPages(8, 8)).toBe(1)
    expect(totalPages(9, 8)).toBe(2)
  })
})
