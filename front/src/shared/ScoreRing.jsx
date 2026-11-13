/**
 * 매칭 점수 링 (토큰: 원 r=25 stroke 5, 배경 #ecebe6, 진행 #2f7a80)
 *
 * 사용 예:
 *   <ScoreRing score={92} />                         // 결과 카드 64px
 *   <ScoreRing score={92} size={96} label="매칭" />   // 상세 화면
 *
 * @param {{ score: number, size?: number, label?: string }} props
 */
export default function ScoreRing({ score, size = 64, label }) {
  const r = 25
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const big = size >= 90

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flex: 'none' }}
      role="img"
      aria-label={`매칭 점수 ${clamped}%`}
    >
      <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-ring-track)" strokeWidth="5" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
          transform="rotate(-90 30 30)"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1.1,
        }}
      >
        {label && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</span>}
        <span style={{ fontWeight: 700, fontSize: big ? 22 : 15 }}>{clamped}%</span>
      </div>
    </div>
  )
}
