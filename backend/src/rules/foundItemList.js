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

// 출처별 목록을 접수일 최신순으로 합친다 (같은 날이면 앞 목록 먼저).
// 각 목록 안의 순서는 유지하므로, 각 목록이 접수순이어야 결과도 정확한 접수순이 된다.
// 앞부분만 합쳐도 전체를 합친 결과의 앞부분과 같다.
export function mergeByRegistration(lists, limit = Infinity) {
  const idx = lists.map(() => 0)
  // 정렬 키(접수일)는 미리 계산
  const keys = lists.map((list) => list.map(registrationDate))
  const out = []
  while (out.length < limit) {
    let pick = -1
    for (let i = 0; i < lists.length; i++) {
      if (idx[i] >= lists[i].length) continue
      if (pick === -1 || keys[i][idx[i]] > keys[pick][idx[pick]]) pick = i
    }
    if (pick === -1) break
    out.push(lists[pick][idx[pick]++])
  }
  return out
}

// 접수일 최신순으로 정렬 (같은 날은 원래 순서 유지)
export function sortByRegistration(items) {
  return items
    .map((item, i) => ({ item, i, key: registrationDate(item) }))
    .sort((a, b) => (a.key === b.key ? a.i - b.i : a.key < b.key ? 1 : -1))
    .map((x) => x.item)
}

/**
 * atcId에서 접수일(YYYYMMDD)을 꺼낸다. 경찰청 목록 API는 습득일이 아니라 atcId 순으로 준다.
 * - 경찰관서: F + YYYYMMDD + 순번   (예: F2026111100004030 → 20261111). API 순서 = 접수 최신순
 * - 포털기관: V + 기관번호 7자리 + (L) + MMDD + 순번 4자리 (예: V0007751L11100002 → 1110)
 *   연도가 없어 습득일과 가장 가까운 해로 정한다. API 순서는 기관번호순이라 접수순이 아니다.
 * 형식이 다르면 습득일을 쓴다.
 */
export function registrationDate({ atcId = '', fdYmd = '' }) {
  const fd = fdYmd.replaceAll('-', '')
  const police = atcId.match(/^F(\d{8})\d+$/)
  if (police) return police[1]

  const portal = atcId.match(/^V\d{7}L?(\d{4})\d{4}$/)
  if (portal && fd.length === 8) {
    const year = Number(fd.slice(0, 4))
    const candidates = [year - 1, year, year + 1].map((y) => `${y}${portal[1]}`)
    const dist = (ymd) => Math.abs(toUtc(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6)}`) - toUtc(fdYmd))
    return candidates.reduce((best, c) => (dist(c) < dist(best) ? c : best))
  }
  return fd
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
