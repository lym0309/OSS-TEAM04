import { Outlet } from 'react-router'
import Sidebar from './Sidebar.jsx'
import './Layout.css'

// 공용 레이아웃: 좌측 72px 사이드바 + 본문
export default function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  )
}
