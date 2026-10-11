import type { Email, SmtpMailer } from '../../infrastructure/smtp-mailer.ts'
import { formatMoney } from '../../shop/money.ts'
import type { Notifier, OrderNotification } from '../ports.ts'

const emailFor = (notification: OrderNotification): Email => {
  const { id, customer, total } = notification.order
  const to = customer.email
  switch (notification.kind) {
    case 'order-confirmed':
      return {
        to,
        subject: `Order ${id} confirmed`,
        body: `Hello ${customer.name}, we received your order of ${formatMoney(total)}.`,
      }
    case 'order-shipped':
      return { to, subject: `Order ${id} shipped`, body: `Hello ${customer.name}, your order is on its way.` }
    case 'order-cancelled':
      return {
        to,
        subject: `Order ${id} cancelled`,
        body: `Hello ${customer.name}, your order was cancelled: ${notification.reason}.`,
      }
  }
}

export class EmailNotifier implements Notifier {
  private readonly mailer: SmtpMailer

  constructor(mailer: SmtpMailer) {
    this.mailer = mailer
  }

  notify(notification: OrderNotification): void {
    this.mailer.send(emailFor(notification))
  }
}
