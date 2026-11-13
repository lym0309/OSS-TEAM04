// found_items 테이블 저장 (수집기용)

// INSERT 할 컬럼 (rules/foundItemRow.js 의 결과와 같은 이름)
export const UPSERT_COLUMNS = [
  'atc_id', 'fd_sn', 'source',
  'fd_prdt_nm', 'prdt_cl_nm', 'clr_nm', 'fd_ymd', 'reg_ymd', 'dep_place', 'img_url',
  'category', 'color_family', 'region', 'has_photo',
]
// 이미 있는 습득물이면 목록 값만 새로 덮어쓴다. 키·지역은 따로 처리
const OVERWRITE_COLUMNS = UPSERT_COLUMNS.filter((c) => !['atc_id', 'fd_sn', 'region'].includes(c))

// 한 번에 INSERT 할 최대 줄 수 (쿼리가 너무 커지지 않게)
export const UPSERT_BATCH = 500

/**
 * 여러 줄을 한 번에 저장하는 SQL.
 * - 처음 보는 습득물: 새로 추가 (first_seen_at = 지금 → 신규 후보 판정에 사용)
 * - 이미 있는 습득물: 목록 값 갱신 + last_seen_at = 지금. first_seen_at은 그대로
 * - region: 지역을 모르고 받은 경우(NULL)에는 기존 값을 지우지 않는다
 */
export function buildUpsert(rows) {
  const sql =
    `INSERT INTO found_items (${UPSERT_COLUMNS.join(', ')}) VALUES ? AS new
     ON DUPLICATE KEY UPDATE
       ${OVERWRITE_COLUMNS.map((c) => `${c} = new.${c}`).join(',\n       ')},
       region = COALESCE(new.region, found_items.region),
       last_seen_at = CURRENT_TIMESTAMP`
  const values = [rows.map((row) => UPSERT_COLUMNS.map((c) => row[c]))]
  return { sql, values }
}

// 여러 줄 INSERT 결과의 info("Records: 3  Duplicates: 1  Warnings: 0")에서 "이미 있던 줄" 수를 꺼낸다.
// affectedRows는 값이 그대로인 줄도 1로 세서(mysql2 기본 설정) 새로 추가된 수를 알 수 없다.
// ⚠️ MySQL은 한 줄짜리 INSERT에는 info를 주지 않는다 → upsertMany에서 따로 처리
export function countDuplicates(result) {
  const match = /Duplicates:\s*(\d+)/.exec(result?.info ?? '')
  if (!match) throw new Error(`INSERT 결과를 해석할 수 없어요: ${result?.info}`)
  return Number(match[1])
}

export function createFoundItemsRepo(pool) {
  /**
   * @returns {Promise<{ inserted: number, updated: number }>}
   */
  async function upsertMany(rows) {
    let inserted = 0
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const batch = rows.slice(i, i + UPSERT_BATCH)
      const { sql, values } = buildUpsert(batch)
      if (batch.length === 1) {
        const [found] = await pool.query('SELECT 1 FROM found_items WHERE atc_id = ? AND fd_sn = ?', [
          batch[0].atc_id,
          batch[0].fd_sn,
        ])
        await pool.query(sql, values)
        if (found.length === 0) inserted++
      } else {
        const [result] = await pool.query(sql, values)
        inserted += batch.length - countDuplicates(result)
      }
    }
    return { inserted, updated: rows.length - inserted }
  }

  return { upsertMany }
}

const LOCK_NAME = 'zupzup_collect'

/**
 * 수집이 동시에 두 번 돌지 않도록 MySQL 잠금을 잡고 fn을 실행한다.
 * (서버의 자동 수집과 npm run collect가 겹치는 경우 등)
 * @returns {Promise<{ skipped: true } | { skipped: false, result: any }>}
 */
export async function withCollectLock(pool, fn) {
  const conn = await pool.getConnection()
  try {
    const [[{ locked }]] = await conn.query('SELECT GET_LOCK(?, 0) AS locked', [LOCK_NAME])
    if (locked !== 1) return { skipped: true }
    try {
      return { skipped: false, result: await fn() }
    } finally {
      await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME])
    }
  } finally {
    conn.release()
  }
}
