import { vi } from 'vitest'
import type { Clock } from '../src/notifications/clock.ts'

export const mailerFailing = (times: number) => {
  let failures = 0
  return {
    send: vi.fn((_to: string, _body: string) => {
      if (failures < times) {
        failures += 1
        throw new Error('SMTP timeout')
      }
    }),
  }
}

export const recordingLogger = () => {
  const lines: string[] = []
  return { lines, info: (line: string) => void lines.push(line) }
}

export class FakeClock implements Clock {
  private current = 0

  now(): number {
    return this.current
  }

  advance(ms: number): void {
    this.current += ms
  }
}
