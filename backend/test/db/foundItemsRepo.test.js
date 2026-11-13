import { describe, expect, it, vi } from 'vitest'
import {
  UPSERT_BATCH,
  UPSERT_COLUMNS,
  buildUpsert,
  countDuplicates,
  createFoundItemsRepo,
  withCollectLock,
} from '../../src/db/foundItemsRepo.js'

const row = (n) => Object.fromEntries(UPSERT_COLUMNS.map((c) => [c, c === 'atc_id' ? `F${n}` : `${c}-${n}`]))

describe('buildUpsert', () => {
  it('여러 줄을 한 번에 넣고, 있으면 갱신하는 SQL', () => {
    const { sql, values } = buildUpsert([row(1), row(2)])
    expect(sql).toContain('INSERT INTO found_items')
    expect(sql).toContain('ON DUPLICATE KEY UPDATE')
    // 다시 보면 last_seen_at만 갱신하고 first_seen_at은 건드리지 않는다
    expect(sql).toContain('last_seen_at = CURRENT_TIMESTAMP')
    expect(sql).not.toContain('first_seen_at')
    // 지역을 모르고 받은 경우 기존 지역 유지
    expect(sql).toContain('region = COALESCE(new.region, found_items.region)')
    // 키는 덮어쓰지 않는다
    expect(sql).not.toMatch(/atc_id = new/)
    expect(values).toEqual([[UPSERT_COLUMNS.map((c) => row(1)[c]), UPSERT_COLUMNS.map((c) => row(2)[c])]])
  })
})

describe('createFoundItemsRepo.upsertMany', () => {
  it(`${UPSERT_BATCH}줄씩 나눠 저장하고, 새로 추가된 수를 계산한다`, async () => {
    // 첫 묶음: 전부 새로, 둘째 묶음: 10줄 중 7줄은 이미 있음
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce([{ info: `Records: ${UPSERT_BATCH}  Duplicates: 0  Warnings: 0` }])
        .mockResolvedValueOnce([{ info: 'Records: 10  Duplicates: 7  Warnings: 0' }]),
    }
    const repo = createFoundItemsRepo(pool)
    const rows = Array.from({ length: UPSERT_BATCH + 10 }, (_, i) => row(i))

    expect(await repo.upsertMany(rows)).toEqual({ inserted: UPSERT_BATCH + 3, updated: 7 })
    expect(pool.query).toHaveBeenCalledTimes(2)
    expect(pool.query.mock.calls[1][1][0]).toHaveLength(10)
  })

  it('한 줄이면 (MySQL이 info를 주지 않아서) 먼저 있는지 확인한다', async () => {
    const pool = {
      query: vi
        .fn()
        .mockResolvedValueOnce([[]]) // 없음
        .mockResolvedValueOnce([{ affectedRows: 1, info: '' }])
        .mockResolvedValueOnce([[{ 1: 1 }]]) // 있음
        .mockResolvedValueOnce([{ affectedRows: 1, info: '' }]),
    }
    const repo = createFoundItemsRepo(pool)
    expect(await repo.upsertMany([row(1)])).toEqual({ inserted: 1, updated: 0 })
    expect(await repo.upsertMany([row(1)])).toEqual({ inserted: 0, updated: 1 })
  })

  it('빈 목록이면 쿼리하지 않는다', async () => {
    const pool = { query: vi.fn() }
    expect(await createFoundItemsRepo(pool).upsertMany([])).toEqual({ inserted: 0, updated: 0 })
    expect(pool.query).not.toHaveBeenCalled()
  })
})

describe('countDuplicates', () => {
  it('INSERT 결과 info에서 이미 있던 줄 수를 꺼낸다', () => {
    expect(countDuplicates({ info: 'Records: 3  Duplicates: 1  Warnings: 0' })).toBe(1)
    expect(() => countDuplicates({ info: '' })).toThrow()
  })
})

describe('withCollectLock', () => {
  const fakePool = (locked) => {
    const conn = {
      query: vi.fn(async (sql) => (sql.includes('GET_LOCK') ? [[{ locked }]] : [[{}]])),
      release: vi.fn(),
    }
    return { conn, pool: { getConnection: vi.fn(async () => conn) } }
  }

  it('잠금을 잡으면 실행하고 풀어준다', async () => {
    const { pool, conn } = fakePool(1)
    expect(await withCollectLock(pool, async () => 'ok')).toEqual({ skipped: false, result: 'ok' })
    expect(conn.query).toHaveBeenLastCalledWith('SELECT RELEASE_LOCK(?)', ['zupzup_collect'])
    expect(conn.release).toHaveBeenCalled()
  })

  it('다른 곳에서 수집 중이면 실행하지 않는다', async () => {
    const { pool, conn } = fakePool(0)
    const fn = vi.fn()
    expect(await withCollectLock(pool, fn)).toEqual({ skipped: true })
    expect(fn).not.toHaveBeenCalled()
    expect(conn.release).toHaveBeenCalled()
  })

  it('실행 중 오류가 나도 잠금을 풀고 커넥션을 돌려준다', async () => {
    const { pool, conn } = fakePool(1)
    await expect(withCollectLock(pool, async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(conn.query).toHaveBeenLastCalledWith('SELECT RELEASE_LOCK(?)', ['zupzup_collect'])
    expect(conn.release).toHaveBeenCalled()
  })
})
