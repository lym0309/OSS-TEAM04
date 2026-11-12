// 습득물 목록(전체 습득물 조회) 계산 규칙. 모두 순수 함수
import { colorFamily } from './colors.js'

export const NEW_ITEM_DAYS = 3

// 한국 시간 기준 오늘 (YYYY-MM-DD)
export function todayKst(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now)
}

const toUtc = (ymd) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10))

export function addDays(ymd, days) {
  return new Date(toUtc(ymd) + days * 86_400_000).toISOString().slice(0, 10)
}

export function daysBetween(fromYmd, toYmd) {
  return Math.round((toUtc(toYmd) - toUtc(fromYmd)) / 86_400_000)
}

// 최근 N일 (오늘 포함) → API 파라미터용 YYYYMMDD
export function periodRange(today, days) {
  return {
    startYmd: addDays(today, -(days - 1)).replaceAll('-', ''),
    endYmd: today.replaceAll('-', ''),
  }
}

// 습득일이 오늘 포함 최근 3일 안이면 NEW
export function isNewItem(fdYmd, today) {
  const diff = daysBetween(fdYmd, today)
  return diff >= 0 && diff < NEW_ITEM_DAYS
}

// 출처별 목록(각각 API 접수순)을 습득일 최신순으로 합친다.
// 각 목록의 순서는 유지하므로, 앞부분만 합쳐도 전체를 합친 결과의 앞부분과 같다.
export function mergeByLatest(lists, limit = Infinity) {
  const idx = lists.map(() => 0)
  const out = []
  while (out.length < limit) {
    let pick = -1
    for (let i = 0; i < lists.length; i++) {
      const head = lists[i][idx[i]]
      if (head && (pick === -1 || head.fdYmd > lists[pick][idx[pick]].fdYmd)) pick = i
    }
    if (pick === -1) break
    out.push(lists[pick][idx[pick]++])
  }
  return out
}

const normalize = (s = '') => s.toLowerCase().replace(/\s+/g, '')

// 검색어(물품명·분류명 포함 여부)와 색 계열로 거르기. API가 지원하지 않아 서버에서 처리
export function matchesFilter(item, { q, clr }) {
  if (q && !normalize(`${item.fdPrdtNm}${item.prdtClNm}`).includes(normalize(q))) return false
  if (clr && colorFamily(item.clrNm) !== clr) return false
  return true
}

export function totalPages(totalCount, pageSize) {
  return Math.max(1, Math.ceil(totalCount / pageSize))
}
