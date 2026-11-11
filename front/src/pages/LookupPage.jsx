import { useState } from 'react'
import { useNavigate } from 'react-router'

// TODO(@kwonminsooo): 조회 코드로 다시 접속 → 신규 후보 확인
export default function LookupPage() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed) navigate(`/lost/${encodeURIComponent(trimmed)}`)
  }

  return (
    <section>
      <h1>조회 코드로 확인</h1>
      <form onSubmit={handleSubmit} className="lookup-form">
        <label htmlFor="code">조회 코드</label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="발급받은 조회 코드를 입력하세요"
          autoComplete="off"
        />
        <button type="submit">확인</button>
      </form>
    </section>
  )
}
