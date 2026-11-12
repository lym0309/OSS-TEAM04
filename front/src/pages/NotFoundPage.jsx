import { Link } from 'react-router'
import Placeholder from '../components/Placeholder.jsx'

export default function NotFoundPage() {
  return (
    <Placeholder title="페이지를 찾을 수 없어요">
      <p>
        <Link to="/">새 검색으로 가기</Link>
      </p>
    </Placeholder>
  )
}
