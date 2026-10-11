import type { Mailer } from './mailer.ts'
import type { Notifier } from './notifier.ts'

export class EmailNotifier implements Notifier {
  private readonly mailer: Mailer

  constructor(mailer: Mailer) {
    this.mailer = mailer
  }

  notify(recipient: string, message: string): void {
    this.mailer.send(recipient, message)
  }
}
