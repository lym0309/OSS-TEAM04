import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { pingDb } from './db/pool.js'
import { errorHandler } from './middlewares/errorHandler.js'
import { notFound } from './middlewares/notFound.js'
import { createApiRouter } from './routes/index.js'
import { createFoundItemsService } from './services/foundItems.js'
import { createPoliceApi } from './services/policeApi.js'

const defaultDeps = () => ({
  pingDb,
  foundItems: createFoundItemsService({ policeApi: createPoliceApi() }),
})

// 테스트에서 DB 등 의존성을 바꿔 끼울 수 있도록 앱 생성 함수를 분리
// 넘긴 것만 바뀌고 나머지는 기본값을 쓴다
export function createApp(overrides = {}) {
  const deps = { ...defaultDeps(), ...overrides }
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', 1) // Caddy 리버스 프록시 뒤에서 실행
  app.use(cors({ origin: env.corsOrigins }))
  app.use(express.json({ limit: '100kb' }))

  app.use('/api', createApiRouter(deps))

  app.use(notFound)
  app.use(errorHandler)
  return app
}
