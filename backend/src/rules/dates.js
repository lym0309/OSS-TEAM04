// 날짜 규칙 (순수 함수)

/** 실제로 있는 날짜인지 (YYYY-MM-DD). 2026-02-30 같은 값은 false */
export function isValidYmd(ymd) {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false
  const date = new Date(`${ymd}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === ymd
}
