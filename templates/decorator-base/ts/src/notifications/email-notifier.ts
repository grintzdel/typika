import type { Clock } from './clock.ts'
import type { Logger } from './logger.ts'
import type { Mailer } from './mailer.ts'
import type { Notifier } from './notifier.ts'

export type EmailNotifierOptions = {
  readonly maxAttempts?: number
  readonly logger?: Logger
  readonly throttle?: { readonly clock: Clock; readonly intervalMs: number }
}

export class EmailNotifier implements Notifier {
  private readonly mailer: Mailer
  private readonly options: EmailNotifierOptions
  private readonly lastSentAt = new Map<string, number>()

  constructor(mailer: Mailer, options: EmailNotifierOptions = {}) {
    this.mailer = mailer
    this.options = options
  }

  notify(recipient: string, message: string): void {
    const { maxAttempts = 1, logger, throttle } = this.options

    if (throttle) {
      const last = this.lastSentAt.get(recipient)
      if (last !== undefined && throttle.clock.now() - last < throttle.intervalMs) return
    }

    for (let attempt = 1; ; attempt += 1) {
      try {
        this.mailer.send(recipient, message)
        break
      } catch (error) {
        if (attempt >= maxAttempts) {
          logger?.info(`failed to notify ${recipient}: ${error instanceof Error ? error.message : String(error)}`)
          throw error
        }
      }
    }

    logger?.info(`notified ${recipient}`)
    if (throttle) this.lastSentAt.set(recipient, throttle.clock.now())
  }
}
