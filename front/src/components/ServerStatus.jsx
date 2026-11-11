import { useEffect, useState } from 'react'
import { getHealth } from '../api/client.js'

// 초기 세팅 확인용: 백엔드·DB 연결 상태 표시
export default function ServerStatus() {
  const [status, setStatus] = useState({ state: 'loading' })

  useEffect(() => {
    let ignore = false
    getHealth()
      .then((data) => !ignore && setStatus({ state: 'ok', db: data.db }))
      .catch(() => !ignore && setStatus({ state: 'error' }))
    return () => {
      ignore = true
    }
  }, [])

  const label = {
    loading: '서버 확인 중…',
    ok: `서버 연결됨 · DB ${status.db === 'ok' ? '연결됨' : '연결 안 됨'}`,
    error: '서버에 연결할 수 없음',
  }[status.state]

  return (
    <p className={`server-status server-status--${status.state}`} role="status">
      {label}
    </p>
  )
}
