import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

// 커넥션 풀은 앱 전체에서 하나만 사용
// 쿼리 예: const [rows] = await pool.execute('SELECT * FROM lost WHERE code = ?', [code])
export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+09:00',
  dateStrings: true,
})

export async function pingDb() {
  const conn = await pool.getConnection()
  try {
    await conn.ping()
  } finally {
    conn.release()
  }
}

export async function closeDb() {
  await pool.end()
}
