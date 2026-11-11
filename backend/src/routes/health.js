import { Router } from 'express'

// GET /api/health — 서버·DB 상태 확인 (배포 후 모니터링, 프론트 연결 확인용)
export function createHealthRouter({ pingDb }) {
  const router = Router()

  router.get('/', async (req, res) => {
    let db = 'ok'
    try {
      await pingDb()
    } catch {
      db = 'error'
    }
    res.status(db === 'ok' ? 200 : 503).json({
      status: db === 'ok' ? 'ok' : 'degraded',
      db,
      uptime: Math.round(process.uptime()),
    })
  })

  return router
}
