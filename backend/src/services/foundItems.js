import { categoryCode, regionCode } from '../rules/foundItemCodes.js'
import {
  isNewItem,
  matchesFilter,
  mergeByRegistration,
  periodRange,
  sortByRegistration,
  todayKst,
  totalPages,
} from '../rules/foundItemList.js'
import { SOURCE_NAMES } from './policeApi.js'

export const PAGE_SIZE = 8
const SCAN_ROWS = 5000 // 전체 훑기 때 한 번에 받는 건수 (API 호출 수를 줄이기 위해 크게)
// 5,000건 응답 하나가 파싱 후 약 10MB라, 메모리(192MB)를 위해 출처별로 한 페이지씩만 받는다
// 넘겨 볼 수 있는 최대 건수 (= 625페이지). 건수(totalCount)는 실제 값을 그대로 알려준다
export const MAX_BROWSE_ROWS = 5000
export const MAX_PAGE = MAX_BROWSE_ROWS / PAGE_SIZE
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX = 10 // 항목 하나가 최대 약 4MB (5,000건)

// 전체 습득물 조회 (GET /api/found-items). 최신 접수순
// - 검색어·색상이 없으면: 출처별 앞부분 (page × 8건)만 받아 합친다 → 호출 2번
//   ⚠️ 포털기관 API는 접수순이 아니라 기관번호순으로 줘서, 이 경우 포털기관 항목의 순서는 대략적이다.
//      습득물을 DB에 수집하는 방식(#16)으로 바꾸면서 해결 예정
// - 검색어·색상이 있으면: API가 지원하지 않아 기간 내 전체를 훑으며 서버에서 거른다 → 순서 정확
//   메모리 제한(컨테이너 192MB) 때문에 페이지 단위로 거르고, 걸러진 결과만 캐시한다.
export function createFoundItemsService({ policeApi, now = () => new Date() }) {
  const cache = new Map() // key → { expiresAt, promise }

  function cached(key, load) {
    const hit = cache.get(key)
    if (hit && hit.expiresAt > Date.now()) return hit.promise
    const promise = load()
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, promise })
    promise.catch(() => cache.delete(key)) // 실패는 캐시하지 않음
    if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
    return promise
  }

  // 출처 하나의 기간 내 전체를 훑으며 조건에 맞는 것을 센다.
  // 항목은 접수 최신순으로 최대 MAX_BROWSE_ROWS개만 보관 (포털기관은 API 순서가 접수순이 아니라 직접 정렬)
  async function scanSource(source, base, filter) {
    let kept = []
    let count = 0
    const trim = () => {
      kept = sortByRegistration(kept).slice(0, MAX_BROWSE_ROWS)
    }

    let pages = 1
    for (let pageNo = 1; pageNo <= pages; pageNo++) {
      const res = await policeApi.listFoundItems(source, { ...base, pageNo, numOfRows: SCAN_ROWS })
      pages = Math.ceil(res.totalCount / SCAN_ROWS)
      for (const it of res.items) {
        if (!matchesFilter(it, filter)) continue
        count++
        kept.push(it)
      }
      if (kept.length > MAX_BROWSE_ROWS * 2) trim() // 메모리를 위해 중간중간 줄인다
    }
    trim()
    return { totalCount: count, items: kept }
  }

  async function loadFiltered(base, filter) {
    // 출처끼리는 동시에, 출처 안에서는 한 페이지씩
    const results = await Promise.all(SOURCE_NAMES.map((s) => scanSource(s, base, filter)))
    return {
      totalCount: results.reduce((sum, r) => sum + r.totalCount, 0),
      items: mergeByRegistration(results.map((r) => r.items), MAX_BROWSE_ROWS),
    }
  }

  async function loadHead(base, rows) {
    const results = await Promise.all(
      SOURCE_NAMES.map((s) => policeApi.listFoundItems(s, { ...base, pageNo: 1, numOfRows: rows })),
    )
    return {
      totalCount: results.reduce((sum, r) => sum + r.totalCount, 0),
      items: mergeByRegistration(results.map((r) => r.items), rows),
    }
  }

  /**
   * @param {{ q?: string, cat?: string, clr?: string, region?: string, period: number, page: number }} query
   *   cat·region·clr는 이름 (예: 지갑, 서울, 검정). 라우터에서 검증된 값
   */
  async function browse({ q = '', cat = '', clr = '', region = '', period, page }) {
    const today = todayKst(now())
    const base = {
      ...periodRange(today, period),
      categoryCode: categoryCode(cat),
      regionCode: regionCode(region),
    }
    const offset = (page - 1) * PAGE_SIZE
    const keyBase = [today, period, cat, region].join('|')

    let result
    if (q || clr) {
      result = await cached(`scan|${keyBase}|${q}|${clr}`, () => loadFiltered(base, { q, clr }))
    } else {
      // 5페이지 단위로 묶어 받아 캐시 재사용률을 높인다
      const rows = Math.min(
        Math.ceil((offset + PAGE_SIZE) / (PAGE_SIZE * 5)) * PAGE_SIZE * 5,
        MAX_BROWSE_ROWS,
      )
      result = await cached(`head|${keyBase}|${rows}`, () => loadHead(base, rows))
    }

    return {
      items: result.items
        .slice(offset, offset + PAGE_SIZE)
        .map((it) => ({ ...it, isNew: isNewItem(it.fdYmd, today) })),
      totalCount: result.totalCount,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.min(totalPages(result.totalCount, PAGE_SIZE), MAX_PAGE),
    }
  }

  return { browse }
}
