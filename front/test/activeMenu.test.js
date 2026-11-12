import { describe, expect, it } from 'vitest'
import { activeMenu } from '../src/components/activeMenu.js'

describe('사이드바 활성 메뉴', () => {
  it.each([
    ['/', '', 'new'],
    ['/confirm/abc', '', 'new'],
    ['/results/abc', '', 'new'],
    ['/results/abc', '?new=1', 'new'],
    ['/history', '', 'history'],
    ['/history', '?code=', 'code'],
    ['/history', '?code=FND-7K2Q-48', 'code'],
    ['/browse', '?page=2', 'browse'],
    ['/items/F2026/1', '', null],
  ])('%s%s → %s', (pathname, search, expected) => {
    expect(activeMenu(pathname, search)).toBe(expected)
  })
})
