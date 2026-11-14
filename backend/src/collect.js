// 습득물 수집 실행
//   - 서버(server.js)가 주기적으로 실행
//   - 직접 한 번: npm run collect (항상 COLLECT_DAYS일 전체)
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { createCollectRunsRepo, createFoundItemsRepo, withCollectLock } from './db/foundItemsRepo.js'
import { closeDb, pool } from './db/pool.js'
import { configuredSources, createCollector, planCollectRun } from './services/collector.js'
import { createPoliceApi } from './services/policeApi.js'

export function createCollectJob({ log = console.log } = {}) {
  const sources = configuredSources(env)
  const collector = createCollector({
    policeApi: createPoliceApi(),
    repo: createFoundItemsRepo(pool),
    sources,
    days: env.collect.days,
    log,
  })

  const runs = createCollectRunsRepo(pool)

  // 한 회차: 전체(하루 한 번) / 최근 며칠 / 건너뛰기를 정해서 실행하고 collect_runs에 기록
  // force: npm run collect처럼 무조건 전체 수집
  async function runLocked({ force }) {
    const mode = planCollectRun({ ...(await runs.lastRuns()), intervalMinutes: env.collect.intervalMinutes, force })
    if (mode === 'skip') {
      log('[collect] 조금 전에 수집해서 이번 회차는 건너뜁니다')
      return null
    }
    const days = mode === 'full' ? env.collect.days : env.collect.recentDays
    const { id, startedAt } = await runs.start(mode, days)
    log(`[collect] ${mode === 'full' ? '전체' : '최근'} 수집 시작 (최근 ${days}일)`)
    const results = await collector.collectOnce({ days, markGoneBefore: mode === 'full' ? startedAt : null })
    await runs.finish(id, { ok: Object.values(results).every((r) => !r.error), result: results })
    return results
  }

  // 다른 곳에서 수집 중이면 건너뛴다
  async function run({ force = false } = {}) {
    const { skipped, result } = await withCollectLock(pool, () => runLocked({ force }))
    if (skipped) log('[collect] 다른 곳에서 수집 중이라 이번 회차는 건너뜁니다')
    return result
  }

  return { sources, run }
}

// npm run collect
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const job = createCollectJob()
  try {
    if (job.sources.length === 0) {
      throw new Error('POLICE_API_KEY / POLICE_PT_API_KEY 가 backend/.env에 없어요')
    }
    const result = await job.run({ force: true })
    if (result && Object.values(result).some((r) => r.error)) process.exitCode = 1
  } catch (err) {
    console.error(`[collect] 실패: ${err.message}`)
    process.exitCode = 1
  } finally {
    await closeDb()
  }
}
