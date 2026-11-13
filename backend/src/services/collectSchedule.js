// 수집을 주기적으로 실행한다.
// 다음 수집은 이전 수집이 "끝난 뒤" intervalMs 후에 시작 → 수집이 오래 걸려도 겹치지 않는다.
export function startCollectSchedule({ run, intervalMs, firstDelayMs = 10_000, log = console.log }) {
  let timer = null
  let stopped = false

  async function tick() {
    if (stopped) return
    try {
      await run()
    } catch (err) {
      log(`[collect] 수집 실패: ${err.message}`)
    }
    if (!stopped) schedule(intervalMs)
  }

  function schedule(ms) {
    timer = setTimeout(tick, ms)
    timer.unref?.() // 서버 종료를 막지 않게
  }

  schedule(firstDelayMs) // 서버가 뜬 직후 한 번
  return {
    stop() {
      stopped = true
      clearTimeout(timer)
    },
  }
}
