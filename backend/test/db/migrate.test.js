import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MIGRATIONS_DIR,
  checksum,
  planMigrations,
  runMigrations,
  sortMigrationFiles,
} from '../../src/db/migrate.js'

describe('sortMigrationFiles', () => {
  it('번호순으로 정렬하고 .sql이 아닌 파일은 무시한다', () => {
    expect(sortMigrationFiles(['002_b.sql', 'README.md', '001_a.sql'])).toEqual(['001_a.sql', '002_b.sql'])
  })

  it('이름 형식이 틀리면 오류', () => {
    expect(() => sortMigrationFiles(['1_a.sql'])).toThrow('형식 오류')
    expect(() => sortMigrationFiles(['001-add.sql'])).toThrow('형식 오류')
    expect(() => sortMigrationFiles(['001_Add.sql'])).toThrow('형식 오류')
  })

  it('번호가 겹치면 오류', () => {
    expect(() => sortMigrationFiles(['001_a.sql', '001_b.sql'])).toThrow('번호 중복')
  })
})

describe('planMigrations', () => {
  const f = (version, sql = version) => ({ version, checksum: checksum(sql) })

  it('기록에 없는 파일만 실행 대상', () => {
    const { pending, modified } = planMigrations([f('001_a.sql'), f('002_b.sql')], [f('001_a.sql')])
    expect(pending.map((p) => p.version)).toEqual(['002_b.sql'])
    expect(modified).toEqual([])
  })

  it('실행된 파일의 내용이 바뀌면 modified', () => {
    const { modified } = planMigrations([f('001_a.sql', '바뀐 내용')], [f('001_a.sql')])
    expect(modified.map((m) => m.version)).toEqual(['001_a.sql'])
  })
})

// DB 대신 쿼리를 기록하는 가짜 연결
function fakeConn({ applied = [], lock = 1, failOn } = {}) {
  const queries = []
  const rows = [...applied]
  return {
    queries,
    rows,
    async query(sql, params) {
      queries.push(sql.trim().split('\n')[0])
      if (failOn && sql.includes(failOn)) throw new Error('SQL 오류')
      if (sql.startsWith('SELECT GET_LOCK')) return [[{ locked: lock }]]
      if (sql.startsWith('SELECT version')) return [rows]
      if (sql.startsWith('INSERT INTO schema_migrations')) rows.push({ version: params[0], checksum: params[1] })
      return [[]]
    },
  }
}

describe('runMigrations', () => {
  let dir
  const log = () => {}

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'migrate-'))
    await writeFile(path.join(dir, '001_a.sql'), 'CREATE TABLE a (id INT);')
    await writeFile(path.join(dir, '002_b.sql'), 'CREATE TABLE b (id INT);')
  })
  afterEach(() => rm(dir, { recursive: true, force: true }))

  it('처음에는 모든 파일을 순서대로 실행하고 기록한다', async () => {
    const conn = fakeConn()
    expect(await runMigrations({ conn, dir, log })).toEqual(['001_a.sql', '002_b.sql'])
    expect(conn.rows.map((r) => r.version)).toEqual(['001_a.sql', '002_b.sql'])
    expect(conn.queries.indexOf('CREATE TABLE a (id INT);')).toBeLessThan(
      conn.queries.indexOf('CREATE TABLE b (id INT);'),
    )
  })

  it('두 번째 실행에서는 아무것도 하지 않는다', async () => {
    const conn = fakeConn()
    await runMigrations({ conn, dir, log })
    expect(await runMigrations({ conn, dir, log })).toEqual([])
  })

  it('실행된 파일이 수정되면 오류를 내고 아무것도 실행하지 않는다', async () => {
    const conn = fakeConn({ applied: [{ version: '001_a.sql', checksum: checksum('예전 내용') }] })
    await expect(runMigrations({ conn, dir, log })).rejects.toThrow('수정되었습니다')
    expect(conn.queries).not.toContain('CREATE TABLE b (id INT);')
    expect(conn.queries.at(-1)).toBe('SELECT RELEASE_LOCK(?)')
  })

  it('중간 파일이 실패하면 그 파일은 기록하지 않고 잠금을 푼다', async () => {
    const conn = fakeConn({ failOn: 'CREATE TABLE b' })
    await expect(runMigrations({ conn, dir, log })).rejects.toThrow('SQL 오류')
    expect(conn.rows.map((r) => r.version)).toEqual(['001_a.sql'])
    expect(conn.queries.at(-1)).toBe('SELECT RELEASE_LOCK(?)')
  })

  it('잠금을 얻지 못하면 오류', async () => {
    const conn = fakeConn({ lock: 0 })
    await expect(runMigrations({ conn, dir, log })).rejects.toThrow('잠금')
  })
})

describe('실제 migrations 폴더', () => {
  it('파일 이름이 규칙에 맞다', async () => {
    const files = await readdir(MIGRATIONS_DIR)
    expect(() => sortMigrationFiles(files)).not.toThrow()
    expect(sortMigrationFiles(files).length).toBeGreaterThan(0)
  })
})
