import { describe, expect, it } from 'vitest'
import { isValidYmd } from '../../src/rules/dates.js'

describe('isValidYmd', () => {
  it('실제 있는 날짜만 true', () => {
    expect(isValidYmd('2026-02-28')).toBe(true)
    expect(isValidYmd('2028-02-29')).toBe(true) // 윤년
    expect(isValidYmd('2026-02-29')).toBe(false)
    expect(isValidYmd('2026-02-30')).toBe(false)
    expect(isValidYmd('2026-13-01')).toBe(false)
  })

  it('YYYY-MM-DD 형식이 아니면 false', () => {
    expect(isValidYmd('20260228')).toBe(false)
    expect(isValidYmd('2026-2-28')).toBe(false)
    expect(isValidYmd('')).toBe(false)
    expect(isValidYmd(undefined)).toBe(false)
    expect(isValidYmd(20260228)).toBe(false)
  })
})
