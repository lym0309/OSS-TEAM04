import { createApp } from './app.js'
import { env } from './config/env.js'
import { closeDb } from './db/pool.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`[server] http://localhost:${env.port} (${env.nodeEnv})`)
})

// docker stop 등으로 종료될 때 커넥션 정리
const shutdown = (signal) => {
  console.log(`[server] ${signal} 수신, 종료 중...`)
  server.close(async () => {
    await closeDb().catch(() => {})
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
