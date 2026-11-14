import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, NETWORK_ERROR_MESSAGE, api } from '../src/api/client.js'

const jsonResponse = (status, data) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

describe('api client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('성공하면 JSON을 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(201, { lostItemId: 'abc' })))
    expect(await api.post('/api/lost-items', { rawText: 'x' })).toEqual({ lostItemId: 'abc' })
  })

  it('서버 오류는 서버가 준 문구로 ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(400, { error: { message: '5자 이상 입력해 주세요.' } })))
    await expect(api.get('/x')).rejects.toMatchObject({ name: 'ApiError', status: 400, message: '5자 이상 입력해 주세요.' })
  })

  it('네트워크 오류(서버 꺼짐 등)는 안내 문구로 바꾼다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    const err = await api.get('/x').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 0, message: NETWORK_ERROR_MESSAGE })
  })

  it('요청 취소(AbortError)는 그대로 넘긴다', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(abort)))
    await expect(api.get('/x')).rejects.toBe(abort)
  })
})
