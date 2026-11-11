import { Router } from 'express'
import { createHealthRouter } from './health.js'

// /api 하위 라우터 모음
// 기능 라우터는 여기에 추가: router.use('/lost', createLostRouter(deps))
export function createApiRouter(deps) {
  const router = Router()
  router.use('/health', createHealthRouter(deps))
  return router
}
