import { describe, expect, it } from 'vitest'
import { COLOR_FAMILIES, colorBaseName, colorFamily } from '../../src/rules/colors.js'

describe('colorBaseName', () => {
  it('괄호 안 한글 색 이름을 꺼낸다', () => {
    expect(colorBaseName('블랙(검정)')).toBe('검정')
    expect(colorBaseName('딥스카이블루(새파란하늘)')).toBe('새파란하늘')
  })

  it('괄호가 없으면 원문 그대로', () => {
    expect(colorBaseName('기타')).toBe('기타')
    expect(colorBaseName('')).toBe('')
  })
})

describe('colorFamily', () => {
  it.each([
    ['화이트(흰)', '흰색'],
    ['블랙(검정)', '검정'],
    ['라이트그레이(옅은회)', '회색'],
    ['그레이(암회)', '회색'],
    ['실버(은)', '은색'],
    ['코럴(산호)', '빨강'],
    ['다크오렌지(어두운오렌지)', '주황'],
    ['라임그린(어두운청록)', '청록'],
    ['로열블루(밝은남)', '남색'],
    ['블루바이올렛(남보라)', '보라'],
    ['퓨시아(자홍)', '분홍'],
  ])('%s → %s', (clrNm, family) => {
    expect(colorFamily(clrNm)).toBe(family)
  })

  it('모르는 색이나 빈 값은 기타', () => {
    expect(colorFamily('기타')).toBe('기타')
    expect(colorFamily('무지개(무지개)')).toBe('기타')
    expect(colorFamily(undefined)).toBe('기타')
  })

  it('반환하는 계열은 모두 필터 선택지에 있다', () => {
    for (const clrNm of ['화이트(흰)', '코발트(짙은청록)', '올리브(녹갈)', '기타']) {
      expect(COLOR_FAMILIES).toContain(colorFamily(clrNm))
    }
  })
})
