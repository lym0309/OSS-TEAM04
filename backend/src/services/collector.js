// 습득물 수집기: 경찰청 API(경찰서 + 포털기관)에서 최근 N일치 습득물을 받아 found_items에 저장한다.
//
// 수집 순서 (출처마다)
//   1. 지역 코드별로 나눠 받는다 → 목록 응답에 지역이 없어서, 어느 지역으로 받았는지로 region을 채운다
//   2. 지역별 건수의 합이 전체 건수보다 적으면 (지역 코드가 없는 습득물, 실패한 지역 등)
//      지역 없이 한 번 더 받아 빠진 것을 채운다 (이때 region은 비워 두고, 이미 있던 값은 유지)
//
// 메모리 (백엔드 192MB): 1,000건씩 받아 바로 저장하고 버린다. 출처도 하나씩 차례로.
import { REGIONS } from '../rules/foundItemCodes.js'
import { periodRange, todayKst } from '../rules/foundItemList.js'
import { toFoundItemRow } from '../rules/foundItemRow.js'
import { SOURCE_NAMES } from './policeApi.js'

export const COLLECT_ROWS = 1000 // 한 번에 받는 건수 (1,000건 ≈ XML 2MB)

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

  // 결과: total(API 전체 건수), inserted(처음 저장된 습득물 수), saved(저장한 줄 수. 지역 없이 다시 받으면 중복 포함),
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
    for (const region of REGIONS) {
      try {
        const stat = await collectPass(source, range, region)
        regionalTotal += stat.total
        add(stat)
      } catch (err) {
        sum.failedRegions.push(region.name)
        log(`[collect] ${source} ${region.name} 실패: ${err.message}`)
      }
    }

    // 2. 빠진 것 채우기
    const { totalCount } = await policeApi.listFoundItems(source, { ...range, pageNo: 1, numOfRows: 1 })
    sum.total = totalCount
    if (regionalTotal < totalCount) {
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
          r.filledWithoutRegion && '지역 없이 한 번 더 받음',
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
