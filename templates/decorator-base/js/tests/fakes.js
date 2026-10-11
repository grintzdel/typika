import { vi } from 'vitest'

export const mailerFailing = (times) => {
  let failures = 0
  return {
    send: vi.fn(() => {
      if (failures < times) {
        failures += 1
        throw new Error('SMTP timeout')
      }
    }),
  }
}

export const recordingLogger = () => {
  const lines = []
  return { lines, info: (line) => void lines.push(line) }
}

export class FakeClock {
  #current = 0

  now() {
    return this.#current
  }

  advance(ms) {
    this.#current += ms
  }
}
