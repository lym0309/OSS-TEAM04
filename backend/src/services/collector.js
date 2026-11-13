// 습득물 수집기: 경찰청 API(경찰서 + 포털기관)에서 최근 N일치 습득물을 받아 found_items에 저장한다.
//
// 수집 순서 (출처마다)
//   1. 지역 코드별로 나눠 받는다 → 목록 응답에 지역이 없어서, 어느 지역으로 받았는지로 region을 채운다
//      REGIONS(17개 시·도) + 이름을 정할 수 없는 코드(UNMAPPED_REGION_CODES, region = NULL)
//   2. 지역별 건수의 합이 전체 건수보다 MISSING_TOLERANCE건 넘게 적으면 (실패한 지역 등)
//      지역 없이 한 번 더 받아 빠진 것을 채운다 (이때 region은 비워 두고, 이미 있던 값은 유지)
//      → 전체를 한 번 더 받는 거라 시간이 2배. 몇 건 차이는 수집 중 새로 등록된 것이라 다음 수집 때 잡힌다
//
// 메모리 (백엔드 192MB): 1,000건씩 받아 바로 저장하고 버린다. 출처도 하나씩 차례로.
import { REGIONS, UNMAPPED_REGION_CODES } from '../rules/foundItemCodes.js'
import { periodRange, todayKst } from '../rules/foundItemList.js'
import { toFoundItemRow } from '../rules/foundItemRow.js'
import { SOURCE_NAMES } from './policeApi.js'

export const COLLECT_ROWS = 1000 // 한 번에 받는 건수 (1,000건 ≈ XML 2MB)
export const MISSING_TOLERANCE = 50 // 지역별 합과 전체 건수가 이만큼까지 차이 나는 건 넘어간다
export const MAX_CONSECUTIVE_FAILURES = 3 // 지역이 연달아 이만큼 실패하면 (인증키 오류·API 장애) 그 출처는 이번 회차 중단

// 수집할 지역 코드 (name이 null이면 region을 비워 저장)
const COLLECT_REGIONS = [...REGIONS, ...UNMAPPED_REGION_CODES.map((code) => ({ name: null, code }))]

// 인증키가 설정된 출처만 수집한다
export function configuredSources(env) {
  const keys = { police: env.policeApi.serviceKey, portal: env.portalApi.serviceKey }
  return SOURCE_NAMES.filter((s) => keys[s])
}

/**
 * @param {{ policeApi: { listFoundItems: Function },
 *           repo: { upsertMany: (rows: object[]) => Promise<{ inserted: number }> },
 *           sources?: string[], days: number, now?: () => Date, log?: (msg: string) => void }} deps
 */
export function createCollector({ policeApi, repo, sources = SOURCE_NAMES, days, now = () => new Date(), log = console.log }) {
  // 한 조건(출처 + 지역)의 모든 페이지를 받아 저장
  async function collectPass(source, range, region) {
    const stat = { total: 0, saved: 0, inserted: 0, skipped: 0 }
    let pages = 1
    for (let pageNo = 1; pageNo <= pages; pageNo++) {
      const res = await policeApi.listFoundItems(source, {
        ...range,
        regionCode: region?.code,
        pageNo,
        numOfRows: COLLECT_ROWS,
      })
      if (pageNo === 1) {
        stat.total = res.totalCount
        pages = Math.ceil(res.totalCount / COLLECT_ROWS)
      }
      if (res.items.length === 0) break // 수집 중에 건수가 줄어든 경우

      const rows = []
      for (const item of res.items) {
        const row = toFoundItemRow(item, { source, region: region?.name ?? null })
        if (row) rows.push(row)
        else stat.skipped++
      }
      if (rows.length > 0) {
        const { inserted } = await repo.upsertMany(rows)
        stat.inserted += inserted
        stat.saved += rows.length
      }
    }
    return stat
  }

  // 결과: total(API 전체 건수), missing(지역별로 받은 합과의 차이), inserted(처음 저장된 습득물 수), saved(저장한 줄 수. 지역 없이 다시 받으면 중복 포함),
  //       skipped(관리번호·습득일이 없어 저장 못 함), failedRegions, filledWithoutRegion
  async function collectSource(source, range) {
    const sum = { total: 0, saved: 0, inserted: 0, skipped: 0, failedRegions: [], filledWithoutRegion: false }
    const add = (stat) => {
      sum.saved += stat.saved
      sum.inserted += stat.inserted
      sum.skipped += stat.skipped
    }

    // 1. 지역별
    let regionalTotal = 0
    let consecutiveFailures = 0
    for (const region of COLLECT_REGIONS) {
      try {
        const stat = await collectPass(source, range, region)
        regionalTotal += stat.total
        add(stat)
        consecutiveFailures = 0
      } catch (err) {
        sum.failedRegions.push(region.name ?? region.code)
        log(`[collect] ${source} ${region.name ?? region.code} 실패: ${err.message}`)
        // 남은 지역도 실패할 게 뻔하니 API 호출을 아낀다. 다음 회차에 다시 시도
        if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          throw new Error(`${MAX_CONSECUTIVE_FAILURES}개 지역이 연달아 실패해 중단 (${err.message})`)
        }
      }
    }

    // 2. 빠진 것 채우기
    let totalCount
    try {
      ;({ totalCount } = await policeApi.listFoundItems(source, { ...range, pageNo: 1, numOfRows: 1 }))
    } catch (err) {
      // 지역별 수집은 이미 저장됐으니 결과는 남기고, 빠진 것 채우기만 건너뛴다
      log(`[collect] ${source} 전체 건수 확인 실패, 빠진 것 채우기는 건너뜀: ${err.message}`)
      sum.total = regionalTotal
      sum.missing = 0
      return sum
    }
    sum.total = totalCount
    sum.missing = Math.max(0, totalCount - regionalTotal)
    if (sum.missing > MISSING_TOLERANCE) {
      add(await collectPass(source, range, null))
      sum.filledWithoutRegion = true
    }
    return sum
  }

  /**
   * 수집 한 번. 출처 하나가 실패해도 나머지는 계속한다.
   * @returns {Promise<Record<string, object>>} 출처별 결과
   */
  async function collectOnce() {
    const today = todayKst(now())
    const range = periodRange(today, days)
    const results = {}
    for (const source of sources) {
      const startedAt = Date.now()
      try {
        const r = await collectSource(source, range)
        results[source] = r
        const notes = [
          `새 습득물 ${r.inserted.toLocaleString()}건`,
          r.skipped && `저장 못 한 항목 ${r.skipped}건`,
          r.failedRegions.length && `실패 지역 ${r.failedRegions.join('·')}`,
          r.filledWithoutRegion && `지역별 합이 ${r.missing}건 적어 지역 없이 한 번 더 받음`,
        ].filter(Boolean)
        log(
          `[collect] ${source}: 최근 ${days}일 습득물 ${r.total.toLocaleString()}건 확인` +
            ` (${notes.join(', ')}) · ${Math.round((Date.now() - startedAt) / 1000)}초`,
        )
      } catch (err) {
        results[source] = { error: err.message }
        log(`[collect] ${source} 실패: ${err.message}`)
      }
    }
    return results
  }

  return { collectOnce }
}
