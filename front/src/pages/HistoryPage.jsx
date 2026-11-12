import { useSearchParams } from 'react-router'
import Placeholder from '../components/Placeholder.jsx'

// TODO(@kwonminsooo): 검색 기록 · 조회 코드로 열기 (시안 5a) — GET /api/history, GET /api/lookup-codes/:code
// ?code= 로 들어오면 조회 코드 입력칸에 포커스
export default function HistoryPage() {
  const [searchParams] = useSearchParams()
  const focusCode = searchParams.has('code')

  return (
    <Placeholder screen="5a" title="검색 기록" owner="@kwonminsooo">
      {focusCode && <p>조회 코드 입력칸 포커스 상태로 진입</p>}
    </Placeholder>
  )
}
