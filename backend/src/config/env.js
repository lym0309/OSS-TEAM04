import 'dotenv/config'

// 환경변수를 한 곳에서 읽고 기본값을 정한다.
// 다른 파일에서는 process.env 대신 이 객체를 사용할 것
const toList = (value) =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

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
    database: process.env.DB_NAME ?? 'lostfound',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 5),
  },

  policeApi: {
    baseUrl:
      process.env.POLICE_API_BASE_URL ??
      'https://apis.data.go.kr/1320000/LosfundInfoInqireService',
    serviceKey: process.env.POLICE_API_KEY ?? '',
  },
}
