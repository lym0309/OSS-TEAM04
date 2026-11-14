// lost_items 테이블 저장·조회. 밖으로는 camelCase(공유 계약 이름)로 주고받는다

const COLUMNS = {
  itemName: 'item_name',
  prdtClNm: 'prdt_cl_nm',
  prdtClCd: 'prdt_cl_cd',
  clrNm: 'clr_nm',
  region: 'region',
  lctCd: 'lct_cd',
  dateFrom: 'date_from',
  dateTo: 'date_to',
  brand: 'brand',
  feature: 'feature',
}
const FIELDS = Object.keys(COLUMNS)

function fromRow(row) {
  return {
    id: row.id,
    rawText: row.raw_text,
    extracted: Boolean(row.extracted),
    ...Object.fromEntries(FIELDS.map((f) => [f, row[COLUMNS[f]] ?? null])),
  }
}

export function createLostItemsRepo(pool) {
  async function insert(item) {
    const columns = ['id', 'raw_text', 'extracted', ...FIELDS.map((f) => COLUMNS[f])]
    const values = [item.id, item.rawText, item.extracted, ...FIELDS.map((f) => item[f] ?? null)]
    await pool.execute(
      `INSERT INTO lost_items (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
      values,
    )
  }

  async function findById(id) {
    const [rows] = await pool.execute('SELECT * FROM lost_items WHERE id = ?', [id])
    return rows[0] ? fromRow(rows[0]) : null
  }

  // 조건만 바꾼다 (원문·extracted는 그대로)
  async function updateCondition(id, condition) {
    await pool.execute(
      `UPDATE lost_items SET ${FIELDS.map((f) => `${COLUMNS[f]} = ?`).join(', ')} WHERE id = ?`,
      [...FIELDS.map((f) => condition[f] ?? null), id],
    )
  }

  return { insert, findById, updateCondition }
}
