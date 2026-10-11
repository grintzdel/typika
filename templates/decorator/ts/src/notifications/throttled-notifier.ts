import type { Clock } from './clock.ts'
import type { Notifier } from './notifier.ts'

export class ThrottledNotifier implements Notifier {
  private readonly inner: Notifier
  private readonly clock: Clock
  private readonly intervalMs: number
  private readonly lastSentAt = new Map<string, number>()

  constructor(inner: Notifier, clock: Clock, intervalMs: number) {
    this.inner = inner
    this.clock = clock
    this.intervalMs = intervalMs
  }

  notify(recipient: string, message: string): void {
    const last = this.lastSentAt.get(recipient)
    if (last !== undefined && this.clock.now() - last < this.intervalMs) return

    this.inner.notify(recipient, message)
    this.lastSentAt.set(recipient, this.clock.now())
  }
}
