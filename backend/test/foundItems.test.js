import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createFoundItemsService, MAX_PAGE } from '../src/services/foundItems.js'

const NOW = () => new Date('2026-11-12T03:00:00Z') // KST 2026-11-12 12:00

const item = (atcId, fdYmd, extra = {}) => ({
  atcId, fdSn: '1', fdPrdtNm: '물건', prdtClNm: '기타물품 > 기타', clrNm: '기타',
  fdYmd, depPlace: '보관소', fdFilePathImg: 'no_img', ...extra,
})

// 출처별 전체 데이터를 들고 페이지 단위로 잘라 주는 가짜 경찰청 API
function fakePoliceApi(data) {
  const calls = []
  return {
    calls,
    async listFoundItems(source, params) {
      calls.push({ source, ...params })
      const all = data[source] ?? []
      const start = (params.pageNo - 1) * params.numOfRows
      return { totalCount: all.length, items: all.slice(start, start + params.numOfRows) }
    },
  }
}

const baseQuery = { q: '', cat: '', clr: '', region: '', period: 7, page: 1 }

describe('foundItems.browse', () => {
  it('두 출처를 습득일 최신순으로 합쳐 8건씩 돌려주고, 건수는 합계', async () => {
    const police = Array.from({ length: 10 }, (_, i) => item(`F${i}`, i < 5 ? '2026-11-11' : '2026-11-05'))
    const portal = Array.from({ length: 3 }, (_, i) => item(`V${i}`, '2026-11-08'))
    const api = fakePoliceApi({ police, portal })
    const svc = createFoundItemsService({ policeApi: api, now: NOW })

    const p1 = await svc.browse(baseQuery)
    expect(p1.totalCount).toBe(13)
    expect(p1.totalPages).toBe(2)
    expect(p1.items.map((x) => x.atcId)).toEqual(['F0', 'F1', 'F2', 'F3', 'F4', 'V0', 'V1', 'V2'])

    const p2 = await svc.browse({ ...baseQuery, page: 2 })
    expect(p2.items.map((x) => x.atcId)).toEqual(['F5', 'F6', 'F7', 'F8', 'F9'])
  })

  it('isNew는 오늘 포함 최근 3일', async () => {
    const api = fakePoliceApi({ police: [item('F1', '2026-11-10'), item('F2', '2026-11-09')] })
    const svc = createFoundItemsService({ policeApi: api, now: NOW })
    const { items } = await svc.browse(baseQuery)
    expect(items.map((x) => x.isNew)).toEqual([true, false])
  })

  it('분류·지역·기간을 경찰청 코드와 날짜로 바꿔 넘긴다', async () => {
    const api = fakePoliceApi({})
    const svc = createFoundItemsService({ policeApi: api, now: NOW })
    await svc.browse({ ...baseQuery, cat: '지갑', region: '서울', period: 3 })
    expect(api.calls[0]).toMatchObject({
      startYmd: '20261110', endYmd: '20261112', categoryCode: 'PRH000', regionCode: 'LCA000',
    })
  })

  it('검색어·색상이 없으면 앞부분만 받는다 (전체를 훑지 않음)', async () => {
    const police = Array.from({ length: 100 }, (_, i) => item(`F${i}`, '2026-11-11'))
    const api = fakePoliceApi({ police })
    const svc = createFoundItemsService({ policeApi: api, now: NOW })
    await svc.browse(baseQuery)
    expect(api.calls.every((c) => c.pageNo === 1 && c.numOfRows === 40)).toBe(true)
  })

  it('검색어·색상이 있으면 기간 전체를 훑어 서버에서 거르고, 걸러진 건수를 돌려준다', async () => {
    const police = [
      item('F1', '2026-11-11', { fdPrdtNm: '에어팟 케이스', clrNm: '화이트(흰)' }),
      item('F2', '2026-11-11', { fdPrdtNm: '에어팟', clrNm: '블랙(검정)' }),
      ...Array.from({ length: 6000 }, (_, i) => item(`X${i}`, '2026-11-10')),
      item('F3', '2026-11-06', { fdPrdtNm: '에어 팟', clrNm: '라이트그레이(옅은회)' }),
    ]
    const api = fakePoliceApi({ police })
    const svc = createFoundItemsService({ policeApi: api, now: NOW })

    const byQ = await svc.browse({ ...baseQuery, q: '에어팟' })
    expect(byQ.items.map((x) => x.atcId)).toEqual(['F1', 'F2', 'F3'])
    expect(byQ.totalCount).toBe(3)
    expect(api.calls.filter((c) => c.source === 'police').map((c) => c.pageNo)).toEqual([1, 2])

    const byQAndColor = await svc.browse({ ...baseQuery, q: '에어팟', clr: '흰색' })
    expect(byQAndColor.items.map((x) => x.atcId)).toEqual(['F1'])
  })

  it('같은 조건은 캐시해서 다시 호출하지 않는다', async () => {
    const api = fakePoliceApi({ police: [item('F1', '2026-11-11')] })
    const svc = createFoundItemsService({ policeApi: api, now: NOW })
    await svc.browse(baseQuery)
    const before = api.calls.length
    await svc.browse(baseQuery)
    await svc.browse({ ...baseQuery, page: 2 }) // 같은 묶음(5페이지) 안
    expect(api.calls.length).toBe(before)
  })

  it('실패한 호출은 캐시하지 않는다', async () => {
    let fail = true
    const api = {
      async listFoundItems() {
        if (fail) throw Object.assign(new Error('down'), { status: 502 })
        return { totalCount: 0, items: [] }
      },
    }
    const svc = createFoundItemsService({ policeApi: api, now: NOW })
    await expect(svc.browse(baseQuery)).rejects.toThrow('down')
    fail = false
    await expect(svc.browse(baseQuery)).resolves.toMatchObject({ totalCount: 0 })
  })

  it('넘겨 볼 수 있는 페이지는 최대 MAX_PAGE', async () => {
    const api = { listFoundItems: async () => ({ totalCount: 50_000, items: [] }) }
    const svc = createFoundItemsService({ policeApi: api, now: NOW })
    const res = await svc.browse(baseQuery)
    expect(res.totalCount).toBe(100_000)
    expect(res.totalPages).toBe(MAX_PAGE)
  })
})

describe('GET /api/found-items', () => {
  const app = (browse = async (q) => ({ received: q })) =>
    createApp({ pingDb: async () => {}, foundItems: { browse } })

  it('쿼리를 검증해 서비스에 넘기고 결과를 그대로 돌려준다', async () => {
    const res = await request(app()).get('/api/found-items').query({
      q: ' 지갑 ', cat: '지갑', clr: '검정', region: '서울', period: '30', page: '3',
    })
    expect(res.status).toBe(200)
    expect(res.body.received).toEqual({ q: '지갑', cat: '지갑', clr: '검정', region: '서울', period: 30, page: 3 })
  })

  it('값이 없으면 기본값 (기간 7일, 1페이지, 전체)', async () => {
    const res = await request(app()).get('/api/found-items')
    expect(res.body.received).toEqual({ q: '', cat: '', clr: '', region: '', period: 7, page: 1 })
  })

  it.each([
    [{ cat: '없는분류' }, '분류'],
    [{ clr: '무지개' }, '색상'],
    [{ region: '평양' }, '지역'],
    [{ period: '5' }, '기간'],
    [{ page: '0' }, '페이지'],
    [{ page: 'abc' }, '페이지'],
    [{ page: String(MAX_PAGE + 1) }, '페이지'],
    [{ q: 'x'.repeat(51) }, '검색어'],
  ])('잘못된 쿼리 %o → 400', async (query, word) => {
    const res = await request(app()).get('/api/found-items').query(query)
    expect(res.status).toBe(400)
    expect(res.body.error.message).toContain(word)
  })

  it('경찰청 API 오류는 502로', async () => {
    const res = await request(
      app(async () => {
        throw Object.assign(new Error('경찰청 API 오류: LIMITED'), { status: 502 })
      }),
    ).get('/api/found-items')
    expect(res.status).toBe(502)
    // 5xx 메시지는 공통 문구로 가리고, 개발 환경에서만 detail에 원인을 담는다
    expect(res.body.error.message).toBe('서버 오류가 발생했습니다.')
    expect(res.body.error.detail).toContain('LIMITED')
  })

  it('GET /api/found-items/filters는 필터 선택지를 돌려준다', async () => {
    const res = await request(app()).get('/api/found-items/filters')
    expect(res.status).toBe(200)
    expect(res.body.categories).toContain('지갑')
    expect(res.body.colors).toContain('검정')
    expect(res.body.regions).toContain('서울')
    expect(res.body.periods).toEqual([3, 7, 30])
    expect(res.body.defaultPeriod).toBe(7)
  })
})
