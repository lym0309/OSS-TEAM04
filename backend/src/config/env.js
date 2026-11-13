import 'dotenv/config'

// 환경변수를 한 곳에서 읽고 기본값을 정한다.
// 다른 파일에서는 process.env 대신 이 객체를 사용할 것
const toList = (value) =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
// 숫자 환경변수. 비었거나 숫자가 아니면 기본값, 범위를 넘으면 범위 안으로
const toNumber = (value, fallback, min, max) => {
  const n = value === undefined || value === '' ? NaN : Number(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  // 허용할 프론트 주소 (쉼표로 구분). 예: http://localhost:5173,https://oss-team04.vercel.app
  corsOrigins: toList(process.env.CORS_ORIGIN ?? 'http://localhost:5173'),

  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'oss',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'zupzup',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 5),
  },

  // 경찰청 습득물 API는 두 종류: 경찰관서 습득물 / 포털기관(지하철·공항·대학 등 공공기관) 습득물
  policeApi: {
    baseUrl:
      process.env.POLICE_API_BASE_URL ??
      'https://apis.data.go.kr/1320000/LosfundInfoInqireService',
    serviceKey: process.env.POLICE_API_KEY ?? '',
  },
  portalApi: {
    baseUrl:
      process.env.POLICE_PT_API_BASE_URL ??
      'https://apis.data.go.kr/1320000/LosPtfundInfoInqireService',
    serviceKey: process.env.POLICE_PT_API_KEY ?? '',
  },

  // 습득물 주기 수집 (services/collector.js)
  collect: {
    enabled: process.env.COLLECT_ENABLED !== 'false', // false면 서버에서 자동 수집 안 함 (npm run collect는 가능)
    intervalMinutes: toNumber(process.env.COLLECT_INTERVAL_MINUTES, 60, 10, 24 * 60), // 수집이 끝난 뒤 다음 수집까지
    days: toNumber(process.env.COLLECT_DAYS, 30, 1, 90), // 최근 며칠치를 받을지 (오늘 포함)
  },
}
