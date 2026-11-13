// 습득물 수집 실행
//   - 서버(server.js)가 주기적으로 실행
//   - 직접 한 번: npm run collect
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { createFoundItemsRepo, withCollectLock } from './db/foundItemsRepo.js'
import { closeDb, pool } from './db/pool.js'
import { configuredSources, createCollector } from './services/collector.js'
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

  // 다른 곳에서 수집 중이면 건너뛴다
  async function run() {
    const { skipped, result } = await withCollectLock(pool, () => collector.collectOnce())
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
    const result = await job.run()
    if (result && Object.values(result).some((r) => r.error)) process.exitCode = 1
  } catch (err) {
    console.error(`[collect] 실패: ${err.message}`)
    process.exitCode = 1
  } finally {
    await closeDb()
  }
}
