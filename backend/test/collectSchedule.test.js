import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startCollectSchedule } from '../src/services/collectSchedule.js'

describe('startCollectSchedule', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('처음엔 firstDelayMs 뒤에, 이후엔 끝난 뒤 intervalMs마다 실행', async () => {
    const run = vi.fn(async () => {})
    const s = startCollectSchedule({ run, intervalMs: 60_000, firstDelayMs: 1_000 })

    await vi.advanceTimersByTimeAsync(999)
    expect(run).toHaveBeenCalledTimes(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(run).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(run).toHaveBeenCalledTimes(2)
    s.stop()
  })

  it('수집이 오래 걸려도 겹쳐 실행하지 않는다', async () => {
    let running = 0
    let maxRunning = 0
    const run = vi.fn(async () => {
      running++
      maxRunning = Math.max(maxRunning, running)
      await new Promise((r) => setTimeout(r, 150_000)) // 간격(60초)보다 오래 걸림
      running--
    })
    const s = startCollectSchedule({ run, intervalMs: 60_000, firstDelayMs: 0 })

    await vi.advanceTimersByTimeAsync(500_000)
    expect(maxRunning).toBe(1)
    expect(run.mock.calls.length).toBeGreaterThanOrEqual(2)
    s.stop()
  })

  it('실패해도 다음 회차는 계속한다', async () => {
    const log = vi.fn()
    const run = vi.fn().mockRejectedValueOnce(new Error('DB 연결 실패')).mockResolvedValue()
    const s = startCollectSchedule({ run, intervalMs: 60_000, firstDelayMs: 0, log })

    await vi.advanceTimersByTimeAsync(60_000)
    expect(run).toHaveBeenCalledTimes(2)
    expect(log).toHaveBeenCalledWith('[collect] 수집 실패: DB 연결 실패')
    s.stop()
  })

  it('stop() 뒤에는 실행하지 않는다', async () => {
    const run = vi.fn(async () => {})
    const s = startCollectSchedule({ run, intervalMs: 60_000, firstDelayMs: 1_000 })
    s.stop()
    await vi.advanceTimersByTimeAsync(200_000)
    expect(run).not.toHaveBeenCalled()
  })
})
