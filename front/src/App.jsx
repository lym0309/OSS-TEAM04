import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import BrowsePage from './pages/BrowsePage.jsx'
import ConfirmPage from './pages/ConfirmPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import ItemDetailPage from './pages/ItemDetailPage.jsx'
import MainInputPage from './pages/MainInputPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ResultsPage from './pages/ResultsPage.jsx'

// 개발 중에만 쓰는 페이지 (배포 빌드에서는 코드째 빠진다)
const DevUiPage = import.meta.env.DEV ? lazy(() => import('./pages/DevUiPage.jsx')) : null

// 라우트 (디자인 핸드오프 기준). 화면 사이에는 lostItemId만 넘긴다.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 이용민: 메인 입력 2a → 조건 확인·수정 3a/3b */}
        <Route index element={<MainInputPage />} />
        <Route path="confirm/:lostItemId" element={<ConfirmPage />} />

        {/* 김창현: 매칭 결과 1a/1b (권민수: ?new=1 신규 습득물 6a/6b) · 상세 4a · 전체 습득물 7a */}
        <Route path="results/:lostItemId" element={<ResultsPage />} />
        <Route path="items/:atcId/:fdSn" element={<ItemDetailPage />} />
        <Route path="browse" element={<BrowsePage />} />

        {/* 권민수: 검색 기록 · 조회 코드 5a (?code= 진입 시 코드 입력 포커스) */}
        <Route path="history" element={<HistoryPage />} />

        {/* 개발 중에만: 공용 UI 모음 */}
        {DevUiPage && (
          <Route
            path="dev/ui"
            element={
              <Suspense>
                <DevUiPage />
              </Suspense>
            }
          />
        )}

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
