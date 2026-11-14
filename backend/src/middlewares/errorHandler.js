import { env } from '../config/env.js'

// 라우터에서 throw 한 에러를 JSON으로 응답
// 상태 코드를 지정하려면: const err = new Error('메시지'); err.status = 400; throw err
// (Express 5는 async 핸들러의 에러도 자동으로 여기로 전달)
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // 요청 본문이 JSON이 아니거나 너무 큰 경우 (express.json). 기본 메시지는 영어라 바꿔 준다
  if (err.type === 'entity.parse.failed') err.message = '요청 형식이 올바르지 않아요. (JSON)'
  if (err.type === 'entity.too.large') err.message = '요청이 너무 커요.'
  const status = err.status ?? err.statusCode ?? 500
  if (status >= 500) console.error(err)

  res.status(status).json({
    error: {
      message: status >= 500 ? '서버 오류가 발생했습니다.' : err.message,
      ...(env.nodeEnv !== 'production' && status >= 500 && { detail: err.message }),
    },
  })
}
