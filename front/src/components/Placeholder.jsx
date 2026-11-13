import './Placeholder.css'

// 아직 구현 전인 화면 자리 표시 (담당자가 실제 화면으로 교체)
export default function Placeholder({ screen, title, owner, children }) {
  return (
    <section className="placeholder">
      {screen && <p className="placeholder__screen">시안 {screen}</p>}
      <h1 className="placeholder__title">{title}</h1>
      {owner && <p className="placeholder__owner">담당 {owner} · 스펙: 디자인 핸드오프 PROMPT.md</p>}
      {children}
    </section>
  )
}
