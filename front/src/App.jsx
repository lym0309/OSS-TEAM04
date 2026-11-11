import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import LostInputPage from './pages/LostInputPage.jsx'
import LookupPage from './pages/LookupPage.jsx'
import MatchResultPage from './pages/MatchResultPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* 분실물 입력 + 검색 조건 확인·수정 */}
        <Route index element={<LostInputPage />} />
        {/* 조회 코드로 다시 접속 */}
        <Route path="lookup" element={<LookupPage />} />
        {/* 매칭 결과 + 신규 후보 */}
        <Route path="lost/:code" element={<MatchResultPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
