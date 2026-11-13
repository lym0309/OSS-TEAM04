import { useParams } from 'react-router'
import Placeholder from '../components/Placeholder.jsx'

// TODO(@kim-ch2): 습득물 상세 (시안 4a) — GET /api/found-items/:atcId/:fdSn
export default function ItemDetailPage() {
  const { atcId, fdSn } = useParams()
  return (
    <Placeholder screen="4a" title="습득물 상세" owner="@kim-ch2">
      <p>
        관리번호: <code>{`${atcId}-${fdSn}`}</code>
      </p>
    </Placeholder>
  )
}
