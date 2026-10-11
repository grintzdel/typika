import type { Notifier } from './notifier.ts'

// #region tour:decorator
export class RetryingNotifier implements Notifier {
  private readonly inner: Notifier
  private readonly maxAttempts: number

  constructor(inner: Notifier, maxAttempts: number) {
    this.inner = inner
    this.maxAttempts = maxAttempts
  }

  notify(recipient: string, message: string): void {
    for (let attempt = 1; ; attempt += 1) {
      try {
        this.inner.notify(recipient, message)
        return
      } catch (error) {
        if (attempt >= this.maxAttempts) throw error
      }
    }
  }
}
// #endregion
