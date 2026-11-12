import { useParams } from 'react-router'
import Placeholder from '../components/Placeholder.jsx'

// TODO(@lym0309): 조건 확인·수정 (시안 3a 성공 / 3b 실패) — PATCH /api/lost-items/:id → /results/:lostItemId
export default function ConfirmPage() {
  const { lostItemId } = useParams()
  return (
    <Placeholder screen="3a / 3b" title="조건 확인·수정" owner="@lym0309">
      <p>
        lostItemId: <code>{lostItemId}</code>
      </p>
    </Placeholder>
  )
}
