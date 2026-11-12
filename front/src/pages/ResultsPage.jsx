import { useParams, useSearchParams } from 'react-router'
import Placeholder from '../components/Placeholder.jsx'

// TODO(@kim-ch2): 매칭 결과 (시안 1a / 결과 없음 1b) — GET /api/lost-items/:id/results
// TODO(@kwonminsooo): ?new=1 이면 신규 습득물 확인 (시안 6a / 6b) — GET /api/lost-items/:id/new-candidates
export default function ResultsPage() {
  const { lostItemId } = useParams()
  const [searchParams] = useSearchParams()
  const isNewView = searchParams.get('new') === '1'

  return isNewView ? (
    <Placeholder screen="6a / 6b" title="새로 들어온 습득물" owner="@kwonminsooo">
      <p>
        lostItemId: <code>{lostItemId}</code>
      </p>
    </Placeholder>
  ) : (
    <Placeholder screen="1a / 1b" title="비슷한 습득물" owner="@kim-ch2">
      <p>
        lostItemId: <code>{lostItemId}</code>
      </p>
    </Placeholder>
  )
}
