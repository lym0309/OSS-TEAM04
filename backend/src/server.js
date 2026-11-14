import { createApp } from './app.js'
import { createCollectJob } from './collect.js'
import { env } from './config/env.js'
import { closeDb } from './db/pool.js'
import { startCollectSchedule } from './services/collectSchedule.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`[server] http://localhost:${env.port} (${env.nodeEnv})`)
})

// 습득물 주기 수집 (서버 시작 10초 뒤 한 번, 이후 끝날 때마다 COLLECT_INTERVAL_MINUTES 뒤)
// 하루 한 번은 COLLECT_DAYS일 전체, 그 사이엔 COLLECT_RECENT_DAYS일만 (services/collector.js planCollectRun)
let collectSchedule = null
if (env.collect.enabled) {
  const job = createCollectJob()
  if (job.sources.length === 0) {
    console.warn('[collect] 경찰청 API 인증키가 없어 자동 수집을 끕니다')
  } else {
    collectSchedule = startCollectSchedule({ run: job.run, intervalMs: env.collect.intervalMinutes * 60_000 })
    console.log(
      `[collect] 자동 수집 켜짐: ${job.sources.join(', ')} · ${env.collect.intervalMinutes}분마다 최근 ${env.collect.recentDays}일` +
        ` (하루 한 번 ${env.collect.days}일 전체)`,
    )
  }
}

// docker stop 등으로 종료될 때 커넥션 정리
const shutdown = (signal) => {
  console.log(`[server] ${signal} 수신, 종료 중...`)
  collectSchedule?.stop()
  server.close(async () => {
    await closeDb().catch(() => {})
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
