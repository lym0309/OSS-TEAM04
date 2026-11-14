import { COLOR_FAMILIES, DEFAULT_PERIOD, PERIODS, findCategory, findRegion } from '../../shared/codes.js'

/**
 * 전체 습득물 화면의 조회 조건. URL 쿼리와 API 쿼리가 같은 이름을 쓴다.
 * @typedef {{ q: string, cat: string, clr: string, region: string, period: number, page: number }} BrowseQuery
 */

/** URL 쿼리 → 조회 조건. 잘못된 값은 기본값("전체")으로 */
export function readBrowseQuery(searchParams) {
  const get = (key) => (searchParams.get(key) ?? '').trim()
  const cat = get('cat')
  const clr = get('clr')
  const region = get('region')
  const period = Number(get('period'))
  const page = Number(get('page'))
  return {
    q: get('q').slice(0, 50),
    cat: findCategory(cat) ? cat : '',
    clr: COLOR_FAMILIES.includes(clr) ? clr : '',
    region: findRegion(region) ? region : '',
    period: PERIODS.includes(period) ? period : DEFAULT_PERIOD,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

/** 조회 조건 → 쿼리 문자열용 객체. 기본값은 빼서 주소를 짧게 */
export function toSearchParams({ q, cat, clr, region, period, page }) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (cat) params.set('cat', cat)
  if (clr) params.set('clr', clr)
  if (region) params.set('region', region)
  if (period !== DEFAULT_PERIOD) params.set('period', String(period))
  if (page > 1) params.set('page', String(page))
  return params
}

/**
 * 페이지 번호 목록: 1 … 4 5 [6] 7 8 … 마지막
 * 현재 페이지 주변 5개 + 처음·마지막, 사이가 비면 '…'
 * @returns {(number|'…')[]}
 */
export function pageList(current, total, windowSize = 5) {
  if (total <= 1) return [1]
  let start = Math.max(1, Math.min(current - Math.floor(windowSize / 2), total - windowSize + 1))
  const end = Math.min(total, start + windowSize - 1)
  start = Math.max(1, start)

  const pages = []
  if (start > 1) pages.push(1)
  if (start > 2) pages.push('…')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push('…')
  if (end < total) pages.push(total)
  return pages
}
