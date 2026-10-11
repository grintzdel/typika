import type { SmtpMailer } from '../../infrastructure/smtp-mailer.ts'
import type { Notifier, OrderNotification } from '../ports.ts'

export class EmailNotifier implements Notifier {
  private readonly mailer: SmtpMailer

  constructor(mailer: SmtpMailer) {
    this.mailer = mailer
  }

  notify(notification: OrderNotification): void {}
}
