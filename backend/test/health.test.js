import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

describe('GET /api/health', () => {
  it('DB 연결이 정상이면 200과 db: ok를 반환한다', async () => {
    const app = createApp({ pingDb: async () => {} })
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', db: 'ok' })
  })

  it('DB 연결이 실패하면 503과 db: error를 반환한다', async () => {
    const app = createApp({
      pingDb: async () => {
        throw new Error('connection refused')
      },
    })
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({ status: 'degraded', db: 'error' })
  })
})

describe('없는 경로', () => {
  it('404와 에러 메시지를 JSON으로 반환한다', async () => {
    const app = createApp({ pingDb: async () => {} })
    const res = await request(app).get('/api/unknown')

    expect(res.status).toBe(404)
    expect(res.body.error.message).toContain('/api/unknown')
  })
})
