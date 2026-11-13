import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getFoundItems } from '../api/foundItems.js'
import { CATEGORIES, COLOR_FAMILIES, PERIODS, REGIONS, colorDisplayName } from '../shared/codes.js'
import Thumbnail from '../shared/Thumbnail.jsx'
import { pageList, readBrowseQuery, toSearchParams } from './browse/browseQuery.js'
import './BrowsePage.css'

// 전체 습득물 조회 (시안 7a). 매칭 없이 경찰청 습득물 전체를 필터로 둘러본다.
// 조회 조건은 URL 쿼리에 그대로 둔다 (뒤로 가기·새로고침 시 유지)
export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = readBrowseQuery(searchParams)
  const queryKey = toSearchParams(query).toString()

  // 마지막으로 받은 응답. 다른 조건의 응답이면 "불러오는 중" (이전 목록은 흐리게 유지)
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getFoundItems(readBrowseQuery(new URLSearchParams(queryKey)), { signal: controller.signal })
      .then((data) => setResult({ key: queryKey, data, error: null }))
      .catch((error) => {
        if (error.name !== 'AbortError') setResult((prev) => ({ ...prev, key: queryKey, error }))
      })
    return () => controller.abort()
  }, [queryKey, retry])

  const loading = result.key !== queryKey
  const error = !loading && result.error
  const data = result.data
  const isSlowQuery = Boolean(query.q || query.clr)

  const go = (next) => {
    setSearchParams(toSearchParams(next))
    window.scrollTo({ top: 0 })
  }
  const onRetry = () => {
    setResult((prev) => ({ ...prev, key: null }))
    setRetry((n) => n + 1)
  }

  return (
    <div className="browse">
      <header className="browse__header">
        <div className="browse__title-row">
          <h1 className="browse__title">전체 습득물</h1>
          <p className="browse__subtitle">
            경찰청에 등록된 습득물 {data ? data.totalCount.toLocaleString() : '–'}건 · 최신 접수순
          </p>
        </div>

        {/* URL 조건이 바뀌면(뒤로 가기 등) 입력칸도 그 값으로 다시 채운다 */}
        <BrowseFilters key={queryKey} initial={query} onSubmit={(next) => go({ ...next, page: 1 })} />
      </header>

      <main className="browse__body">
        {error ? (
          <div className="browse__message" role="alert">
            <p className="browse__message-title">습득물을 불러오지 못했어요</p>
            <p>{error.message}</p>
            <button type="button" className="btn btn-secondary" onClick={onRetry}>
              다시 시도
            </button>
          </div>
        ) : !data ? (
          <Loading slow={isSlowQuery} />
        ) : data.items.length === 0 ? (
          <div className="browse__message">
            <p className="browse__message-title">조건에 맞는 습득물이 없어요</p>
            <p>검색어를 바꾸거나 기간을 늘려 보세요.</p>
          </div>
        ) : (
          <div className={`browse__grid-wrap ${loading ? 'is-loading' : ''}`} aria-busy={loading}>
            {loading && <Loading slow={isSlowQuery} overlay />}
            <ul className="browse__grid">
              {data.items.map((item) => (
                <li key={`${item.atcId}-${item.fdSn}`}>
                  <ItemCard item={item} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && data.totalPages > 1 && !error && (
          <Pagination current={query.page} total={data.totalPages} onChange={(page) => go({ ...query, page })} />
        )}

        <p className="disclaimer browse__footer">
          내 물건과 비슷한 습득물을 점수순으로 보려면 <Link to="/">새 검색</Link>을 이용하세요
        </p>
      </main>
    </div>
  )
}

// 필터 바. 입력 중인 값은 여기서만 들고 있다가 "조회"(또는 Enter) 때 넘긴다
function BrowseFilters({ initial, onSubmit }) {
  const [draft, setDraft] = useState(initial)
  const setField = (key) => (e) =>
    setDraft((d) => ({ ...d, [key]: key === 'period' ? Number(e.target.value) : e.target.value }))

  return (
    <form
      className="browse__filters"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ ...draft, q: draft.q.trim() })
      }}
    >
      <input
        className="browse__search"
        type="search"
        value={draft.q}
        onChange={setField('q')}
        placeholder="물품명으로 검색 (예: 지갑, 에어팟)"
        maxLength={50}
        aria-label="물품명 검색"
      />
      <FilterSelect label="분류" value={draft.cat} onChange={setField('cat')} allLabel="분류 전체"
        options={CATEGORIES.map((c) => c.name)} />
      <FilterSelect label="색상" value={draft.clr} onChange={setField('clr')} allLabel="색상 전체"
        options={COLOR_FAMILIES} />
      <FilterSelect label="지역" value={draft.region} onChange={setField('region')} allLabel="지역 전체"
        options={REGIONS.map((r) => r.name)} />
      <select className="browse__select" value={draft.period} onChange={setField('period')} aria-label="기간">
        {PERIODS.map((p) => (
          <option key={p} value={p}>최근 {p}일</option>
        ))}
      </select>
      <button type="submit" className="btn btn-primary browse__submit">조회</button>
    </form>
  )
}

function FilterSelect({ label, value, onChange, allLabel, options }) {
  return (
    <select className="browse__select" value={value} onChange={onChange} aria-label={label}>
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

function ItemCard({ item }) {
  return (
    <Link className="browse-card" to={`/items/${encodeURIComponent(item.atcId)}/${encodeURIComponent(item.fdSn)}`}>
      <Thumbnail item={item} height={150} radius={0} />
      <div className="browse-card__body">
        <div className="browse-card__name-row">
          <span className="browse-card__name" title={item.fdPrdtNm}>{item.fdPrdtNm}</span>
          {item.isNew && <span className="badge-new">NEW</span>}
        </div>
        <p className="browse-card__meta">
          {item.prdtClNm} · {colorDisplayName(item.clrNm)}
        </p>
        <p className="browse-card__meta browse-card__meta--muted">
          {item.fdYmd} · {item.depPlace}
        </p>
      </div>
    </Link>
  )
}

function Pagination({ current, total, onChange }) {
  return (
    <nav className="pagination" aria-label="페이지">
      <button type="button" className="pagination__step" disabled={current <= 1} onClick={() => onChange(current - 1)}>
        이전
      </button>
      {pageList(current, total).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="pagination__gap">…</span>
        ) : (
          <button
            type="button"
            key={p}
            className={`pagination__page ${p === current ? 'is-current' : ''}`}
            aria-current={p === current ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
      <button type="button" className="pagination__step" disabled={current >= total} onClick={() => onChange(current + 1)}>
        다음
      </button>
    </nav>
  )
}

function Loading({ slow, overlay = false }) {
  return (
    <div className={overlay ? 'browse__loading browse__loading--overlay' : 'browse__message'} role="status">
      <p className="browse__message-title">습득물을 불러오는 중…</p>
      {slow && <p>검색어·색상 조회는 처음 한 번 시간이 걸려요 (최대 1분)</p>}
    </div>
  )
}
