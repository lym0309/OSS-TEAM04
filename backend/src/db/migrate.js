// 간단한 DB 마이그레이션 (Prisma 없이 SQL 파일로 테이블 변경 관리)
//
// 규칙
// - src/db/migrations/ 에 "001_설명.sql" 형식으로 파일을 추가한다. 번호 순서대로 실행된다.
// - 한 번 실행(머지)된 파일은 절대 고치지 않는다. 바꿀 게 있으면 새 번호 파일을 추가한다.
//   (실행된 파일 내용이 바뀌면 체크섬이 달라져 오류를 낸다)
//
// 실행: npm run migrate  (Docker에서는 서버 시작 전에 자동 실행)
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url))
const FILE_PATTERN = /^(\d{3})_[a-z0-9_]+\.sql$/
const LOCK_NAME = 'zupzup_migrate'
const LOCK_TIMEOUT_SEC = 30

export const checksum = (sql) => createHash('sha256').update(sql).digest('hex')

// 파일 이름 검사 + 번호순 정렬
export function sortMigrationFiles(fileNames) {
  const sqlFiles = fileNames.filter((f) => f.endsWith('.sql'))
  const seen = new Map()
  for (const f of sqlFiles) {
    const m = f.match(FILE_PATTERN)
    if (!m) throw new Error(`마이그레이션 파일 이름 형식 오류: ${f} (예: 002_add_lost_items.sql)`)
    if (seen.has(m[1])) throw new Error(`마이그레이션 번호 중복: ${seen.get(m[1])}, ${f}`)
    seen.set(m[1], f)
  }
  return sqlFiles.sort()
}

/**
 * 실행할 파일과 수정된 파일 계산 (순수 함수)
 * @param {{ version: string, checksum: string }[]} files    폴더의 파일 (번호순)
 * @param {{ version: string, checksum: string }[]} applied  DB에 기록된 실행 이력
 */
export function planMigrations(files, applied) {
  const appliedMap = new Map(applied.map((a) => [a.version, a.checksum]))
  return {
    pending: files.filter((f) => !appliedMap.has(f.version)),
    modified: files.filter((f) => appliedMap.has(f.version) && appliedMap.get(f.version) !== f.checksum),
  }
}

async function readMigrationFiles(dir) {
  const names = sortMigrationFiles(await readdir(dir))
  return Promise.all(
    names.map(async (version) => {
      const sql = await readFile(path.join(dir, version), 'utf8')
      return { version, sql, checksum: checksum(sql) }
    }),
  )
}

/**
 * @param {{ conn: import('mysql2/promise').Connection, dir?: string, log?: (msg: string) => void }} options
 *   conn은 multipleStatements: true 로 만든 연결 (SQL 파일 하나에 문장이 여러 개일 수 있음)
 * @returns {Promise<string[]>} 이번에 실행한 파일 이름
 */
export async function runMigrations({ conn, dir = MIGRATIONS_DIR, log = console.log }) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    VARCHAR(100) NOT NULL PRIMARY KEY,
      checksum   CHAR(64)     NOT NULL,
      applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4`)

  // 서버가 여러 개 동시에 떠도 마이그레이션은 한 번만 실행되도록 잠금
  const [[{ locked }]] = await conn.query('SELECT GET_LOCK(?, ?) AS locked', [LOCK_NAME, LOCK_TIMEOUT_SEC])
  if (locked !== 1) throw new Error('마이그레이션 잠금을 얻지 못했습니다. 다른 곳에서 실행 중인지 확인하세요.')

  try {
    const files = await readMigrationFiles(dir)
    const [applied] = await conn.query('SELECT version, checksum FROM schema_migrations')
    const { pending, modified } = planMigrations(files, applied)

    if (modified.length > 0) {
      throw new Error(
        `이미 실행된 마이그레이션 파일이 수정되었습니다: ${modified.map((f) => f.version).join(', ')}\n` +
          '실행된 파일은 고치지 말고 새 번호 파일을 추가하세요.',
      )
    }
    if (pending.length === 0) {
      log('[migrate] 최신 상태입니다.')
      return []
    }

    for (const file of pending) {
      log(`[migrate] 실행: ${file.version}`)
      // MySQL의 CREATE/ALTER TABLE은 트랜잭션으로 되돌릴 수 없으므로,
      // 파일이 성공한 뒤에만 기록한다. 실패하면 기록이 남지 않아 다음 실행 때 다시 시도된다.
      await conn.query(file.sql)
      await conn.query('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)', [
        file.version,
        file.checksum,
      ])
    }
    log(`[migrate] ${pending.length}개 실행 완료`)
    return pending.map((f) => f.version)
  } finally {
    await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME])
  }
}

// `node src/db/migrate.js` 로 직접 실행했을 때
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { default: mysql } = await import('mysql2/promise')
  const { env } = await import('../config/env.js')
  const { connectionLimit: _unused, ...db } = env.db
  const conn = await mysql.createConnection({ ...db, multipleStatements: true, charset: 'utf8mb4' })
  try {
    await runMigrations({ conn })
  } catch (err) {
    console.error(`[migrate] 실패: ${err.message}`)
    process.exitCode = 1
  } finally {
    await conn.end()
  }
}
