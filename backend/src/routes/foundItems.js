import { Router } from 'express'
import { COLOR_FAMILIES } from '../rules/colors.js'
import { CATEGORIES, DEFAULT_PERIOD, PERIODS, REGIONS } from '../rules/foundItemCodes.js'
import { MAX_PAGE } from '../services/foundItems.js'

const badRequest = (message) => Object.assign(new Error(message), { status: 400 })

const categoryNames = CATEGORIES.map((c) => c.name)
const regionNames = REGIONS.map((r) => r.name)

// 쿼리 문자열 검증 → 서비스 입력. 빈 값은 "전체"
export function parseBrowseQuery(query) {
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  const q = str(query.q)
  const cat = str(query.cat)
  const clr = str(query.clr)
  const region = str(query.region)
  const period = query.period === undefined || query.period === '' ? DEFAULT_PERIOD : Number(query.period)
  const page = query.page === undefined || query.page === '' ? 1 : Number(query.page)

  if (q.length > 50) throw badRequest('검색어는 50자 이하로 입력해 주세요.')
  if (cat && !categoryNames.includes(cat)) throw badRequest(`알 수 없는 분류입니다: ${cat}`)
  if (clr && !COLOR_FAMILIES.includes(clr)) throw badRequest(`알 수 없는 색상입니다: ${clr}`)
  if (region && !regionNames.includes(region)) throw badRequest(`알 수 없는 지역입니다: ${region}`)
  if (!PERIODS.includes(period)) throw badRequest(`기간은 ${PERIODS.join(', ')}일 중 하나여야 합니다.`)
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    throw badRequest(`페이지는 1~${MAX_PAGE} 사이 정수여야 합니다.`)
  }
  return { q, cat, clr, region, period, page }
}

export function createFoundItemsRouter({ foundItems }) {
  const router = Router()

  // GET /api/found-items/filters — 필터 선택지 (분류·색상·지역·기간)
  router.get('/filters', (req, res) => {
    res.json({
      categories: categoryNames,
      colors: COLOR_FAMILIES,
      regions: regionNames,
      periods: PERIODS,
      defaultPeriod: DEFAULT_PERIOD,
    })
  })

  // GET /api/found-items?q=&cat=&clr=&region=&period=&page= — 전체 습득물 (최신순, 페이지당 8건)
  router.get('/', async (req, res) => {
    res.json(await foundItems.browse(parseBrowseQuery(req.query)))
  })

  return router
}
