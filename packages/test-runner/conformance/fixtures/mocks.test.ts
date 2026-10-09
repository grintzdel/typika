import { afterEach, describe, expect, it, vi } from 'vitest'

describe('vi', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('records calls on a mock function', () => {
    const notify = vi.fn((name: string) => `hello ${name}`)

    expect(notify('ada')).toBe('hello ada')
    expect(notify).toHaveBeenCalled()
    expect(notify).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledWith('ada')
    expect(notify).toHaveBeenLastCalledWith('ada')
    expect(notify).toHaveBeenNthCalledWith(1, 'ada')
    expect(notify).toHaveBeenCalledOnce()
    expect(notify).toHaveReturnedWith('hello ada')
    expect(notify.mock.calls).toEqual([['ada']])
  })

  it('stubs return values', async () => {
    const next = vi.fn<() => number>().mockReturnValueOnce(1).mockReturnValue(2)
    const load = vi.fn<() => Promise<string>>().mockResolvedValue('data')

    expect([next(), next(), next()]).toEqual([1, 2, 2])
    expect(await load()).toBe('data')
  })

  it('spies on a method and restores it', () => {
    const clock = { now: () => 1 }
    const spy = vi.spyOn(clock, 'now').mockReturnValue(99)

    expect(clock.now()).toBe(99)
    spy.mockRestore()
    expect(clock.now()).toBe(1)
  })

  it('advances fake timers', () => {
    vi.useFakeTimers()
    const tick = vi.fn()
    setTimeout(tick, 1000)
    setInterval(tick, 300)

    vi.advanceTimersByTime(1000)

    expect(tick).toHaveBeenCalledTimes(4)
  })

  it('runs all pending timers', () => {
    vi.useFakeTimers()
    const done = vi.fn()
    setTimeout(() => setTimeout(done, 10), 10)

    vi.runAllTimers()

    expect(done).toHaveBeenCalledOnce()
  })

  it('fails when a mock was not called as expected', () => {
    const notify = vi.fn()
    notify('grace')

    expect(notify).toHaveBeenCalledWith('ada')
  })
})
