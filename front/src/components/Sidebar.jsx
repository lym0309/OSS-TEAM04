import { Link, useLocation } from 'react-router'
import { activeMenu } from './activeMenu.js'
import './Sidebar.css'

const MENUS = [
  { key: 'new', to: '/', label: ['새 검색'], icon: <span className="sidebar__plus">+</span> },
  { key: 'history', to: '/history', label: ['검색 기록'], icon: <span className="sidebar__icon sidebar__icon--circle" /> },
  {
    key: 'code',
    to: '/history?code=',
    label: ['조회 코드', '로 열기'],
    icon: <span className="sidebar__icon sidebar__icon--square" />,
  },
  {
    key: 'browse',
    to: '/browse',
    label: ['전체', '습득물'],
    icon: (
      <span className="sidebar__icon sidebar__icon--grid">
        <span />
        <span />
        <span />
        <span />
      </span>
    ),
  },
]

export default function Sidebar() {
  const { pathname, search } = useLocation()
  const current = activeMenu(pathname, search)

  return (
    <nav className="sidebar" aria-label="주 메뉴">
      <Link to="/" className="sidebar__logo">
        줍줍
      </Link>
      {MENUS.map((m) => (
        <Link
          key={m.key}
          to={m.to}
          className={`sidebar__item${current === m.key ? ' is-active' : ''}`}
          aria-current={current === m.key ? 'page' : undefined}
        >
          {m.icon}
          <span className="sidebar__label">
            {m.label.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </span>
        </Link>
      ))}
    </nav>
  )
}
