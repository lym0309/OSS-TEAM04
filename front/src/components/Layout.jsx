import { Link, Outlet } from 'react-router'
import ServerStatus from './ServerStatus.jsx'

export default function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="logo">줍줍</Link>
        <nav className="nav">
          <Link to="/">분실물 등록</Link>
          <Link to="/lookup">조회 코드로 확인</Link>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <ServerStatus />
        <p>매칭 점수는 검색 조건의 유사성을 나타내며, 실제 소유 여부를 보장하지 않습니다.</p>
      </footer>
    </div>
  )
}
