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

export const NETWORK_ERROR_MESSAGE = '서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.'

export async function request(path, { method = 'GET', body, headers, ...rest } = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...rest,
    })
  } catch (err) {
    // 요청 취소(AbortController)는 그대로 넘긴다 — 화면에서 무시하는 용도
    if (err.name === 'AbortError') throw err
    // 서버가 꺼져 있거나 네트워크 오류: 브라우저 기본 문구(Failed to fetch) 대신 안내 문구
    throw new ApiError(0, NETWORK_ERROR_MESSAGE)
  }

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
