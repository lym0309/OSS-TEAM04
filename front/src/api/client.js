// 백엔드 API 호출 유틸
// - 개발: VITE_API_URL을 비워두면 Vite dev 서버 프록시(/api → localhost:3000)를 사용
// - 배포(Vercel): VITE_API_URL=https://api.<도메인> 으로 설정
// ⚠️ VITE_ 로 시작하는 값은 빌드 결과에 그대로 노출되므로 API 키를 넣지 말 것
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function request(path, { method = 'GET', body, headers, ...rest } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    const message = (isJson && data?.error?.message) || `요청 실패 (${res.status})`
    throw new ApiError(res.status, message, data)
  }
  return data
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
}

export const getHealth = () => api.get('/api/health')
