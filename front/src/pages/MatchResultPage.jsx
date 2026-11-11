import { useParams } from 'react-router'

// TODO(@kim-ch2): 매칭 결과 목록·상세 (GET /api/lost/:code/matches)
// TODO(@kwonminsooo): 신규 후보 NEW 표시 (GET /api/lost/:code/new)
export default function MatchResultPage() {
  const { code } = useParams()

  return (
    <section>
      <h1>매칭 결과</h1>
      <p>
        조회 코드: <code>{code}</code>
      </p>
    </section>
  )
}
