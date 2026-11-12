import ScoreRing from '../shared/ScoreRing.jsx'
import Thumbnail from '../shared/Thumbnail.jsx'
import './DevUiPage.css'

// 개발 중에만 보이는 공용 요소 모음 (/dev/ui). 배포 빌드에서는 라우트가 등록되지 않는다.
const SAMPLE_ITEMS = [
  { fdPrdtNm: '실제 사진 (깨진 링크 → 대분류로 대체)', prdtClNm: '휴대폰 > 아이폰', fdFilePathImg: 'https://example.invalid/photo.jpg' },
  { fdPrdtNm: '사진 없음 · 전자기기', prdtClNm: '전자기기 > 무선이어폰', fdFilePathImg: 'https://minwon24.police.go.kr/images/sub/img02_no_img.gif' },
  { fdPrdtNm: '사진 없음 · 지갑', prdtClNm: '지갑 > 여성용 지갑', fdFilePathImg: 'https://minwon24.police.go.kr/images/sub/img02_no_img.gif' },
  { fdPrdtNm: '사진 없음 · 이미지 없는 분류', prdtClNm: '기타물품 > 기타', fdFilePathImg: 'https://minwon24.police.go.kr/images/sub/img02_no_img.gif' },
]

const COLORS = [
  ['--color-primary', '주색'],
  ['--color-primary-dark', '진한 주색'],
  ['--color-primary-bg', '연한 주색'],
  ['--color-text', '텍스트'],
  ['--color-text-sub', '보조'],
  ['--color-text-muted', '흐림'],
  ['--color-bg', '본문 배경'],
  ['--color-bg-sidebar', '사이드바'],
  ['--color-partial-bar', '부분 일치'],
  ['--color-mismatch-bar', '불일치'],
]

export default function DevUiPage() {
  return (
    <div className="dev-ui">
      <h1>공용 UI 모음</h1>

      <section>
        <h2>색상 토큰</h2>
        <div className="dev-ui__row dev-ui__row--top">
          {COLORS.map(([v, name]) => (
            <div key={v} className="dev-ui__swatch">
              <span style={{ background: `var(${v})` }} />
              <b>{name}</b>
              <code>{v}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>버튼 · 칩 · 태그 · 배지</h2>
        <div className="dev-ui__row">
          <button className="btn btn-primary">이 조건으로 찾기</button>
          <button className="btn btn-primary" disabled>
            비활성
          </button>
          <button className="btn btn-secondary">새로 검색</button>
          <span className="chip">물품 무선이어폰 케이스</span>
          <span className="match-tag match-tag--match">분류 ✓</span>
          <span className="match-tag match-tag--partial">지역 △</span>
          <span className="match-tag match-tag--mismatch">색상 ✕</span>
          <span className="badge-new">NEW</span>
        </div>
      </section>

      <section>
        <h2>매칭 점수 링</h2>
        <div className="dev-ui__row">
          <ScoreRing score={92} />
          <ScoreRing score={61} />
          <ScoreRing score={92} size={96} label="매칭" />
        </div>
      </section>

      <section>
        <h2>썸네일 (사진 → 대분류 이미지 → 📦 기타)</h2>
        <div className="dev-ui__row dev-ui__row--top">
          {SAMPLE_ITEMS.map((item) => (
            <figure key={item.fdPrdtNm} className="dev-ui__thumb">
              <Thumbnail item={item} size={96} />
              <figcaption>{item.fdPrdtNm}</figcaption>
            </figure>
          ))}
        </div>
        <div className="dev-ui__grid">
          {SAMPLE_ITEMS.slice(1).map((item) => (
            <div key={item.fdPrdtNm} className="card">
              <Thumbnail item={item} height={150} radius={0} />
              <p style={{ padding: '12px 16px' }}>height=150 (전체 습득물 카드)</p>
            </div>
          ))}
        </div>
      </section>

      <p className="disclaimer">
        매칭 점수는 조건의 유사도이며, 실제 본인 물건인지는 보관장소에서 확인해야 합니다
      </p>
    </div>
  )
}
