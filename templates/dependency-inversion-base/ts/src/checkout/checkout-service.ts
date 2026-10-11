import { InMemoryOrderStore, type OrderId } from '../infrastructure/in-memory-order-store.ts'
import { SmtpMailer } from '../infrastructure/smtp-mailer.ts'
import { formatMoney } from '../shop/money.ts'
import { totalOf, type Order } from '../shop/order.ts'

export class CheckoutService {
  private readonly orders: InMemoryOrderStore
  private readonly notifier: SmtpMailer

  constructor() {
    this.orders = new InMemoryOrderStore()
    this.notifier = new SmtpMailer('smtp.shop.example', 587)
  }

  placeOrder(order: Order): OrderId {
    const orderId = this.orders.add(order)
    this.notifier.notify(order.customer.email, `Order ${orderId} confirmed: ${formatMoney(totalOf(order))}`)
    return orderId
  }

  findOrder(orderId: OrderId): Order | undefined {
    return this.orders.find(orderId)
  }
}
