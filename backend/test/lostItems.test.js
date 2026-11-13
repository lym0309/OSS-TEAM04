import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createLostItemsService, newLostItemId } from '../src/services/lostItems.js'

const NOW = () => new Date('2026-11-14T03:00:00Z') // KST 2026-11-14 12:00
const ID = 'abcdefghijklmnop'

// lost_items 대신 메모리에 저장
function memoryRepo() {
  const rows = new Map()
  return {
    rows,
    insert: vi.fn(async (item) => void rows.set(item.id, { ...item })),
    findById: vi.fn(async (id) => (rows.has(id) ? { ...rows.get(id) } : null)),
    updateCondition: vi.fn(async (id, condition) => void rows.set(id, { ...rows.get(id), ...condition })),
  }
}

function setup({ extractor } = {}) {
  const repo = memoryRepo()
  const lostItems = createLostItemsService({ repo, extractor, now: NOW, newId: () => ID, log: () => {} })
  return { repo, app: createApp({ lostItems }) }
}

const EMPTY = {
  itemName: null, prdtClNm: null, prdtClCd: null, clrNm: null, region: null, lctCd: null,
  dateFrom: null, dateTo: null, brand: null, feature: null,
}

describe('POST /api/lost-items', () => {
  it('문장을 저장하고 lostItemId를 준다. 추출기가 없으면 extracted:false (→ 3b)', async () => {
    const { app, repo } = setup()
    const res = await request(app).post('/api/lost-items').send({ rawText: '  어제 버스에서 지갑을 잃어버렸어요 ' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ lostItemId: ID, rawText: '어제 버스에서 지갑을 잃어버렸어요', extracted: false, ...EMPTY })
    expect(repo.rows.get(ID).rawText).toBe('어제 버스에서 지갑을 잃어버렸어요')
  })

  it('추출에 성공하면 조건 + 경찰청 코드, extracted:true (→ 3a)', async () => {
    const extractor = vi.fn(async () => ({
      itemName: '에어팟 프로 케이스', prdtClNm: '전자기기', clrNm: '검정', region: '서울',
      dateFrom: '2026-11-13', dateTo: '2026-11-13', brand: 'Apple',
    }))
    const { app } = setup({ extractor })
    const res = await request(app).post('/api/lost-items').send({ rawText: '어제 2호선에서 검정 에어팟 프로 케이스' })

    expect(extractor).toHaveBeenCalledWith('어제 2호선에서 검정 에어팟 프로 케이스', { today: '2026-11-14' })
    expect(res.body).toMatchObject({
      extracted: true, itemName: '에어팟 프로 케이스', prdtClNm: '전자기기', prdtClCd: 'PRG000',
      clrNm: '검정', region: '서울', lctCd: 'LCA000', dateFrom: '2026-11-13', dateTo: '2026-11-13', brand: 'Apple',
    })
  })

  it('추출 결과 중 이상한 값은 버린다 (코드표에 없음, 미래 날짜)', async () => {
    const extractor = async () => ({ itemName: '지갑', clrNm: '무지개색', dateFrom: '2026-11-20', dateTo: '2026-11-21' })
    const res = await request(setup({ extractor }).app).post('/api/lost-items').send({ rawText: '내일 지갑 잃어버릴 예정' })

    expect(res.body).toMatchObject({ extracted: false, itemName: '지갑', clrNm: null, dateFrom: null, dateTo: null })
  })

  it('추출기가 실패해도 저장하고 extracted:false', async () => {
    const extractor = async () => Promise.reject(new Error('Gemini 한도 초과'))
    const res = await request(setup({ extractor }).app).post('/api/lost-items').send({ rawText: '버스에서 지갑 잃어버림' })

    expect(res.status).toBe(201)
    expect(res.body.extracted).toBe(false)
  })

  it('문장이 짧거나 길거나 없으면 400', async () => {
    const { app, repo } = setup()
    for (const body of [{ rawText: '지 갑' }, { rawText: '가'.repeat(501) }, {}, { rawText: 42 }]) {
      const res = await request(app).post('/api/lost-items').send(body)
      expect(res.status).toBe(400)
      expect(res.body.error.message).toBeTruthy()
    }
    expect(repo.insert).not.toHaveBeenCalled()
  })
})

describe('GET /api/lost-items/:id', () => {
  it('저장된 조건을 준다', async () => {
    const { app } = setup()
    await request(app).post('/api/lost-items').send({ rawText: '버스에서 지갑 잃어버림' })
    const res = await request(app).get(`/api/lost-items/${ID}`)
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ lostItemId: ID, rawText: '버스에서 지갑 잃어버림' })
  })

  it('없거나 형식이 다른 id는 404 (DB 조회도 안 함)', async () => {
    const { app, repo } = setup()
    expect((await request(app).get('/api/lost-items/zzzzzzzzzzzzzzzz')).status).toBe(404)
    expect((await request(app).get('/api/lost-items/short')).status).toBe(404)
    expect(repo.findById).toHaveBeenCalledTimes(1)
  })
})

describe('PATCH /api/lost-items/:id', () => {
  async function created() {
    const ctx = setup()
    await request(ctx.app).post('/api/lost-items').send({ rawText: '버스에서 지갑 잃어버림' })
    return ctx
  }

  it('보낸 조건만 바꾸고 코드를 다시 계산한다 (3b 드롭다운)', async () => {
    const { app } = await created()
    const res = await request(app)
      .patch(`/api/lost-items/${ID}`)
      .send({ prdtClNm: '지갑', clrNm: '갈색', region: '경기', dateFrom: '2026-11-12', dateTo: '2026-11-13' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      prdtClNm: '지갑', prdtClCd: 'PRH000', clrNm: '갈색', region: '경기', lctCd: 'LCI000',
      dateFrom: '2026-11-12', dateTo: '2026-11-13', extracted: false,
    })

    // 일부만 바꾸면 나머지는 그대로, null이면 지움 (3a 칩 ✕)
    const res2 = await request(app).patch(`/api/lost-items/${ID}`).send({ region: null, brand: '루이비통' })
    expect(res2.body).toMatchObject({ prdtClNm: '지갑', region: null, lctCd: null, brand: '루이비통' })
    expect((await request(app).get(`/api/lost-items/${ID}`)).body).toMatchObject({ region: null, brand: '루이비통' })
  })

  it('보낸 코드는 무시하고 이름으로 계산한다', async () => {
    const { app } = await created()
    const res = await request(app).patch(`/api/lost-items/${ID}`).send({ prdtClNm: '가방', prdtClCd: 'PRZ000' })
    expect(res.body.prdtClCd).toBe('PRA000')
  })

  it('잘못된 값, 날짜 순서·미래 날짜, 빈 요청은 400 (저장 안 함)', async () => {
    const { app, repo } = await created()
    const bad = [
      { clrNm: '무지개' },
      { dateFrom: '2026-11-13', dateTo: '2026-11-12' },
      { dateTo: '2026-11-15' },
      {},
      { lctCd: 'LCA000' }, // 코드만 보내면 바꿀 조건이 없음
    ]
    for (const body of bad) {
      const res = await request(app).patch(`/api/lost-items/${ID}`).send(body)
      expect(res.status, JSON.stringify(body)).toBe(400)
    }
    expect(repo.updateCondition).not.toHaveBeenCalled()
  })

  it('저장된 날짜와 합쳐서 순서를 검사한다', async () => {
    const { app } = await created()
    await request(app).patch(`/api/lost-items/${ID}`).send({ dateFrom: '2026-11-10', dateTo: '2026-11-11' })
    const res = await request(app).patch(`/api/lost-items/${ID}`).send({ dateFrom: '2026-11-12' })
    expect(res.status).toBe(400)
  })

  it('없는 id는 404', async () => {
    const { app } = setup()
    expect((await request(app).patch('/api/lost-items/zzzzzzzzzzzzzzzz').send({ brand: 'x' })).status).toBe(404)
  })
})

describe('newLostItemId', () => {
  it('URL에 쓸 수 있는 16자, 매번 다름', () => {
    const ids = new Set(Array.from({ length: 1000 }, newLostItemId))
    expect(ids.size).toBe(1000)
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{16}$/)
  })
})
