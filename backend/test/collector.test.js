import { describe, expect, it, vi } from 'vitest'
import {
  COLLECT_ROWS,
  MAX_CONSECUTIVE_FAILURES,
  MISSING_TOLERANCE,
  configuredSources,
  createCollector,
  planCollectRun,
} from '../src/services/collector.js'
import { REGIONS } from '../src/rules/foundItemCodes.js'

const NOW = () => new Date('2026-11-13T03:00:00Z') // 한국 시간 11/13 12시

const makeItem = (n, over = {}) => ({
  atcId: `F20261112${String(n).padStart(8, '0')}`,
  fdSn: '1',
  fdPrdtNm: `물건${n}`,
  prdtClNm: '지갑 > 남성용 지갑',
  clrNm: '블랙(검정)',
  fdYmd: '2026-11-12',
  depPlace: '서울마포경찰서',
  fdFilePathImg: 'https://x/no_img.gif',
  ...over,
})

/**
 * 가짜 경찰청 API. data: { [source]: { [regionCode | 'ALL']: item[] } }
 * 'ALL'이 없으면 지역별 목록을 모두 합친 것이 전체
 */
function fakePoliceApi(data, { failRegion } = {}) {
  const calls = []
  return {
    calls,
    listFoundItems: vi.fn(async (source, params) => {
      calls.push({ source, ...params })
      if (failRegion && params.regionCode === failRegion) throw new Error('HTTP 500')
      const bySource = data[source] ?? {}
      const list = params.regionCode
        ? (bySource[params.regionCode] ?? [])
        : (bySource.ALL ?? Object.values(bySource).flat())
      const start = (params.pageNo - 1) * params.numOfRows
      return { totalCount: list.length, items: list.slice(start, start + params.numOfRows) }
    }),
  }
}

function fakeRepo() {
  const saved = new Map() // key → row (실제 DB처럼 region은 NULL이면 기존 값 유지)
  return {
    saved,
    markGone: vi.fn(async () => 7),
    upsertMany: vi.fn(async (rows) => {
      let inserted = 0
      for (const row of rows) {
        const key = `${row.atc_id}/${row.fd_sn}`
        const prev = saved.get(key)
        if (!prev) inserted++
        saved.set(key, { ...row, region: row.region ?? prev?.region ?? null })
      }
      return { inserted, updated: rows.length - inserted }
    }),
  }
}

const seoul = REGIONS.find((r) => r.name === '서울')
const busan = REGIONS.find((r) => r.name === '부산')

describe('createCollector', () => {
  it('지역별로 받아 region을 채워 저장한다', async () => {
    const api = fakePoliceApi({
      police: { [seoul.code]: [makeItem(1), makeItem(2)], [busan.code]: [makeItem(3)] },
    })
    const repo = fakeRepo()
    const collector = createCollector({ policeApi: api, repo, sources: ['police'], days: 30, now: NOW, log: () => {} })

    const result = await collector.collectOnce()

    expect(result.police).toMatchObject({ total: 3, saved: 3, inserted: 3, skipped: 0, failedRegions: [] })
    expect([...repo.saved.values()].map((r) => [r.fd_prdt_nm, r.region])).toEqual([
      ['물건1', '서울'],
      ['물건2', '서울'],
      ['물건3', '부산'],
    ])
    // 지역별 합 = 전체라 지역 없이 다시 받지 않는다
    expect(result.police.filledWithoutRegion).toBe(false)
  })

  it('최근 N일 (오늘 포함)을 요청한다', async () => {
    const api = fakePoliceApi({})
    const collector = createCollector({ policeApi: api, repo: fakeRepo(), sources: ['police'], days: 30, now: NOW, log: () => {} })
    await collector.collectOnce()
    expect(api.calls[0]).toMatchObject({ startYmd: '20261015', endYmd: '20261113' })
  })

  it('여러 페이지를 끝까지 받는다', async () => {
    const many = Array.from({ length: COLLECT_ROWS * 2 + 5 }, (_, i) => makeItem(i))
    const api = fakePoliceApi({ police: { [seoul.code]: many } })
    const repo = fakeRepo()
    const collector = createCollector({ policeApi: api, repo, sources: ['police'], days: 7, now: NOW, log: () => {} })

    await collector.collectOnce()

    const seoulPages = api.calls.filter((c) => c.regionCode === seoul.code).map((c) => c.pageNo)
    expect(seoulPages).toEqual([1, 2, 3])
    expect(repo.saved.size).toBe(COLLECT_ROWS * 2 + 5)
  })

  it('이름을 정할 수 없는 지역 코드(LCG000 등)도 받아서 region 없이 저장한다', async () => {
    const api = fakePoliceApi({ police: { [seoul.code]: [makeItem(1)], LCG000: [makeItem(2)] } })
    const repo = fakeRepo()
    const collector = createCollector({ policeApi: api, repo, sources: ['police'], days: 7, now: NOW, log: () => {} })

    const result = await collector.collectOnce()

    expect(repo.saved.get(`${makeItem(2).atcId}/1`).region).toBeNull()
    expect(result.police.filledWithoutRegion).toBe(false) // 지역별 합 = 전체
  })

  it(`지역별 합이 전체보다 ${MISSING_TOLERANCE}건 넘게 적으면 지역 없이 한 번 더 받아 채운다 (기존 region은 유지)`, async () => {
    // 지역 코드로 안 잡히는 습득물이 많은 경우
    const unknown = Array.from({ length: MISSING_TOLERANCE + 1 }, (_, i) => makeItem(100 + i))
    const api = fakePoliceApi({ police: { [seoul.code]: [makeItem(1)], ALL: [makeItem(1), ...unknown] } })
    const repo = fakeRepo()
    const collector = createCollector({ policeApi: api, repo, sources: ['police'], days: 7, now: NOW, log: () => {} })

    const result = await collector.collectOnce()

    expect(result.police).toMatchObject({ filledWithoutRegion: true, missing: MISSING_TOLERANCE + 1 })
    expect(result.police.inserted).toBe(MISSING_TOLERANCE + 2)
    expect(repo.saved.get(`${makeItem(1).atcId}/1`).region).toBe('서울')
    expect(repo.saved.get(`${makeItem(100).atcId}/1`).region).toBeNull()
  })

  it('몇 건 차이(수집 중 새로 등록된 것)는 다시 받지 않는다', async () => {
    const api = fakePoliceApi({ police: { [seoul.code]: [makeItem(1)], ALL: [makeItem(1), makeItem(2)] } })
    const collector = createCollector({ policeApi: api, repo: fakeRepo(), sources: ['police'], days: 7, now: NOW, log: () => {} })

    const result = await collector.collectOnce()

    expect(result.police).toMatchObject({ filledWithoutRegion: false, missing: 1 })
    expect(api.calls.filter((c) => !c.regionCode && c.numOfRows === COLLECT_ROWS)).toHaveLength(0)
  })

  it('한 지역이 실패해도 나머지는 계속하고, 빠진 것이 많으면 지역 없이 채운다', async () => {
    const seoulItems = Array.from({ length: MISSING_TOLERANCE + 1 }, (_, i) => makeItem(i))
    const api = fakePoliceApi(
      { police: { [seoul.code]: seoulItems, [busan.code]: [makeItem(900)] } },
      { failRegion: seoul.code },
    )
    const repo = fakeRepo()
    const log = vi.fn()
    const collector = createCollector({ policeApi: api, repo, sources: ['police'], days: 7, now: NOW, log })

    const result = await collector.collectOnce()

    expect(result.police.failedRegions).toEqual(['서울'])
    expect(result.police.filledWithoutRegion).toBe(true)
    expect(repo.saved.size).toBe(MISSING_TOLERANCE + 2)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('서울 실패'))
  })

  it('전체 건수 확인만 실패하면 지역별로 받은 결과는 남긴다', async () => {
    const api = fakePoliceApi({ police: { [seoul.code]: [makeItem(1)] } })
    const original = api.listFoundItems
    api.listFoundItems = vi.fn(async (source, params) => {
      if (!params.regionCode) throw new Error('HTTP 500')
      return original(source, params)
    })
    const repo = fakeRepo()
    const collector = createCollector({ policeApi: api, repo, sources: ['police'], days: 7, now: NOW, log: () => {} })

    const result = await collector.collectOnce()

    expect(result.police).toMatchObject({ total: 1, inserted: 1, filledWithoutRegion: false })
    expect(repo.saved.size).toBe(1)
  })

  it('저장할 수 없는 항목은 건너뛰고 센다', async () => {
    const api = fakePoliceApi({ police: { [seoul.code]: [makeItem(1), makeItem(2, { fdYmd: '' })] } })
    const repo = fakeRepo()
    const collector = createCollector({ policeApi: api, repo, sources: ['police'], days: 7, now: NOW, log: () => {} })

    const result = await collector.collectOnce()

    expect(result.police).toMatchObject({ saved: 1, skipped: 1 })
  })

  it(`지역이 ${MAX_CONSECUTIVE_FAILURES}개 연달아 실패하면 그 출처는 중단하고 다른 출처는 수집한다`, async () => {
    const api = fakePoliceApi({ portal: { [seoul.code]: [makeItem(1, { atcId: 'V0007751L11120001' })] } })
    const original = api.listFoundItems
    api.listFoundItems = vi.fn(async (source, params) => {
      if (source === 'police') throw new Error('인증키 오류')
      return original(source, params)
    })
    const repo = fakeRepo()
    const collector = createCollector({ policeApi: api, repo, sources: ['police', 'portal'], days: 7, now: NOW, log: () => {} })

    const result = await collector.collectOnce()

    expect(result.police.error).toMatch('연달아 실패')
    expect(api.listFoundItems.mock.calls.filter(([s]) => s === 'police')).toHaveLength(MAX_CONSECUTIVE_FAILURES)
    expect(result.portal).toMatchObject({ saved: 1 })
    expect([...repo.saved.values()][0].source).toBe('portal')
  })

  it('한 번에 1,000건씩 요청한다 (메모리 제한)', async () => {
    const api = fakePoliceApi({ police: { [seoul.code]: [makeItem(1)] } })
    const collector = createCollector({ policeApi: api, repo: fakeRepo(), sources: ['police'], days: 7, now: NOW, log: () => {} })
    await collector.collectOnce()
    const pageSizes = new Set(api.calls.filter((c) => c.regionCode).map((c) => c.numOfRows))
    expect([...pageSizes]).toEqual([1000])
  })
})

describe('configuredSources', () => {
  it('인증키가 있는 출처만', () => {
    const env = (police, portal) => ({ policeApi: { serviceKey: police }, portalApi: { serviceKey: portal } })
    expect(configuredSources(env('a', 'b'))).toEqual(['police', 'portal'])
    expect(configuredSources(env('a', ''))).toEqual(['police'])
    expect(configuredSources(env('', ''))).toEqual([])
  })
})

describe('collectOnce: 전체 수집 뒤 사라진 습득물 표시', () => {
  const run = async (api, repo, options) =>
    createCollector({ policeApi: api, repo, sources: ['police'], days: 30, now: NOW, log: () => {} }).collectOnce(options)

  it('markGoneBefore를 주면 빠짐없이 받은 출처의 기간 안에서 표시한다', async () => {
    const repo = fakeRepo()
    const result = await run(fakePoliceApi({ police: { [seoul.code]: [makeItem(1)] } }), repo, {
      markGoneBefore: '2026-11-13 12:00:00',
    })

    expect(repo.markGone).toHaveBeenCalledWith(
      'police',
      { fromYmd: '2026-10-15', toYmd: '2026-11-13' },
      '2026-11-13 12:00:00',
    )
    expect(result.police).toMatchObject({ complete: true, gone: 7 })
  })

  it('최근 며칠 수집(markGoneBefore 없음)에서는 표시하지 않는다', async () => {
    const repo = fakeRepo()
    await run(fakePoliceApi({ police: { [seoul.code]: [makeItem(1)] } }), repo, { days: 3 })
    expect(repo.markGone).not.toHaveBeenCalled()
  })

  it('실패한 지역이 있으면 (빠진 게 있을 수 있어) 표시하지 않는다', async () => {
    const repo = fakeRepo()
    const api = fakePoliceApi({ police: { [seoul.code]: [makeItem(1)] } }, { failRegion: busan.code })
    const result = await run(api, repo, { markGoneBefore: '2026-11-13 12:00:00' })

    expect(result.police.complete).toBe(false)
    expect(repo.markGone).not.toHaveBeenCalled()
  })

  it('days를 주면 그 기간만 받는다', async () => {
    const api = fakePoliceApi({})
    await run(api, fakeRepo(), { days: 3 })
    expect(api.calls[0]).toMatchObject({ startYmd: '20261111', endYmd: '20261113' })
  })
})

describe('planCollectRun', () => {
  const plan = (minutesSinceLast, minutesSinceFull, force) =>
    planCollectRun({ minutesSinceLast, minutesSinceFull, intervalMinutes: 60, force })

  it('수집한 적 없으면 전체', () => {
    expect(plan(null, null)).toBe('full')
  })

  it('조금 전에 수집했으면 건너뛴다 (서버 재시작)', () => {
    expect(plan(5, 120)).toBe('skip')
    expect(plan(58, 120)).toBe('skip')
  })

  it('간격이 지났으면 최근 며칠, 전체 수집한 지 하루(-30분)가 지났으면 전체', () => {
    expect(plan(59, 120)).toBe('recent')
    expect(plan(60, 23 * 60 + 29)).toBe('recent')
    expect(plan(60, 23 * 60 + 30)).toBe('full')
  })

  it('성공한 전체 수집이 없으면 전체', () => {
    expect(plan(60, null)).toBe('full')
  })

  it('force면 언제든 전체 (npm run collect)', () => {
    expect(plan(1, 10, true)).toBe('full')
  })
})
