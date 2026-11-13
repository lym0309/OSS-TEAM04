import { describe, expect, it } from 'vitest'
import { pageList, readBrowseQuery, toSearchParams } from '../src/pages/browse/browseQuery.js'

const read = (qs) => readBrowseQuery(new URLSearchParams(qs))

describe('readBrowseQuery', () => {
  it('값이 없으면 기본값 (전체, 최근 7일, 1페이지)', () => {
    expect(read('')).toEqual({ q: '', cat: '', clr: '', region: '', period: 7, page: 1 })
  })

  it('URL 값을 읽는다', () => {
    expect(read('q=%20에어팟%20&cat=지갑&clr=검정&region=서울&period=30&page=3')).toEqual({
      q: '에어팟', cat: '지갑', clr: '검정', region: '서울', period: 30, page: 3,
    })
  })

  it('잘못된 값은 기본값으로', () => {
    expect(read('cat=없는분류&clr=무지개&region=평양&period=5&page=-1')).toEqual({
      q: '', cat: '', clr: '', region: '', period: 7, page: 1,
    })
    expect(read('page=abc').page).toBe(1)
    expect(read(`q=${'x'.repeat(60)}`).q).toHaveLength(50)
  })
})

describe('toSearchParams', () => {
  it('기본값은 빼고 주소를 짧게', () => {
    expect(toSearchParams(read('')).toString()).toBe('')
    expect(toSearchParams({ q: '지갑', cat: '', clr: '', region: '서울', period: 7, page: 2 }).toString())
      .toBe('q=%EC%A7%80%EA%B0%91&region=%EC%84%9C%EC%9A%B8&page=2')
  })

  it('읽고 다시 쓰면 같은 조건', () => {
    const q = read('q=에어팟&cat=전자기기&period=3&page=4')
    expect(read(toSearchParams(q).toString())).toEqual(q)
  })
})

describe('pageList', () => {
  it('페이지가 적으면 전부', () => {
    expect(pageList(1, 1)).toEqual([1])
    expect(pageList(2, 4)).toEqual([1, 2, 3, 4])
  })

  it('앞쪽: 1 2 3 4 5 … 마지막', () => {
    expect(pageList(1, 625)).toEqual([1, 2, 3, 4, 5, '…', 625])
  })

  it('가운데: 1 … 현재 ±2 … 마지막', () => {
    expect(pageList(50, 625)).toEqual([1, '…', 48, 49, 50, 51, 52, '…', 625])
  })

  it('뒤쪽: 1 … 마지막 5개', () => {
    expect(pageList(625, 625)).toEqual([1, '…', 621, 622, 623, 624, 625])
  })

  it('사이가 한 칸이면 … 대신 바로 이어진다', () => {
    expect(pageList(4, 8)).toEqual([1, 2, 3, 4, 5, 6, '…', 8])
    expect(pageList(3, 6)).toEqual([1, 2, 3, 4, 5, 6])
  })
})
