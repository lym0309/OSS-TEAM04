import { describe, expect, it } from 'vitest'
import { categoryCode, majorCategory, regionCode } from '../../src/rules/foundItemCodes.js'
import {
  addDays,
  daysBetween,
  isNewItem,
  matchesFilter,
  mergeByRegistration,
  periodRange,
  registrationDate,
  sortByRegistration,
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

describe('registrationDate (atcId → 접수일)', () => {
  it('경찰관서: F + YYYYMMDD + 순번', () => {
    expect(registrationDate({ atcId: 'F2026111100004030', fdYmd: '2026-11-09' })).toBe('20261111')
  })

  it('포털기관: V + 기관번호 + (L) + MMDD + 순번, 연도는 습득일 기준', () => {
    expect(registrationDate({ atcId: 'V0007751L11100002', fdYmd: '2026-11-10' })).toBe('20261110')
    expect(registrationDate({ atcId: 'V000731611090002', fdYmd: '2026-11-05' })).toBe('20261109') // L 없는 형식
  })

  it('포털기관: 연말에 습득해 연초에 접수하면 다음 해', () => {
    expect(registrationDate({ atcId: 'V0007751L01020002', fdYmd: '2026-12-30' })).toBe('20270102')
  })

  it('포털기관: 접수일이 습득일보다 조금 앞서는 이상한 데이터도 같은 해로', () => {
    expect(registrationDate({ atcId: 'V0007751L10200002', fdYmd: '2026-10-23' })).toBe('20261020')
  })

  it('형식이 다르면 습득일', () => {
    expect(registrationDate({ atcId: 'X123', fdYmd: '2026-11-08' })).toBe('20261108')
  })
})

describe('mergeByRegistration', () => {
  // 경찰관서는 API 순서가 접수순, 습득일은 순서와 상관없다
  const a = [
    { atcId: 'F2026111100000003', fdYmd: '2026-11-05' },
    { atcId: 'F2026111000000002', fdYmd: '2026-11-10' },
    { atcId: 'F2026110800000001', fdYmd: '2026-11-08' },
  ]
  const b = [
    { atcId: 'V0000001L11100001', fdYmd: '2026-11-10' },
    { atcId: 'V0000001L11090001', fdYmd: '2026-11-02' },
  ]
  const ids = (list) => list.map((x) => x.atcId)

  it('접수일 최신순으로 합치고, 같은 날이면 앞 목록 먼저', () => {
    expect(ids(mergeByRegistration([a, b]))).toEqual([
      'F2026111100000003', 'F2026111000000002', 'V0000001L11100001', 'V0000001L11090001', 'F2026110800000001',
    ])
  })

  it('limit만큼만 합치고, 앞부분만 합쳐도 전체 결과의 앞부분과 같다', () => {
    const full = mergeByRegistration([a, b])
    expect(mergeByRegistration([a, b], 3)).toEqual(full.slice(0, 3))
    expect(mergeByRegistration([a.slice(0, 2), b.slice(0, 2)], 2)).toEqual(full.slice(0, 2))
  })

  it('빈 목록', () => {
    expect(mergeByRegistration([[], []])).toEqual([])
  })
})

describe('sortByRegistration', () => {
  it('포털기관(기관번호순)을 접수일 최신순으로, 같은 날은 원래 순서 유지', () => {
    const items = [
      { atcId: 'V0000009L11010001', fdYmd: '2026-11-01' },
      { atcId: 'V0000009L11100002', fdYmd: '2026-11-10' },
      { atcId: 'V0000001L11100001', fdYmd: '2026-11-10' },
      { atcId: 'V0000001L11050001', fdYmd: '2026-11-05' },
    ]
    expect(sortByRegistration(items).map((x) => x.atcId)).toEqual([
      'V0000009L11100002', 'V0000001L11100001', 'V0000001L11050001', 'V0000009L11010001',
    ])
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
