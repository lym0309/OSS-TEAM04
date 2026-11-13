// 현재 주소에 맞는 사이드바 메뉴 (디자인 핸드오프 기준)
// - 새 검색: 메인 입력 · 조건 확인 · 매칭 결과
// - 검색 기록: /history
// - 조회 코드로 열기: /history?code=
// - 전체 습득물: /browse
export function activeMenu(pathname, search = '') {
  if (pathname === '/' || pathname.startsWith('/confirm') || pathname.startsWith('/results')) return 'new'
  if (pathname.startsWith('/history')) return new URLSearchParams(search).has('code') ? 'code' : 'history'
  if (pathname.startsWith('/browse')) return 'browse'
  return null
}
