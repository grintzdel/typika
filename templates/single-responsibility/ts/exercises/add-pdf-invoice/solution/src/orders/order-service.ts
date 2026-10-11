import { InvoiceFormatter } from '../invoices/invoice-formatter.ts'
import { PdfInvoiceFormatter } from '../invoices/pdf-invoice-formatter.ts'
import { PriceCalculator } from '../pricing/price-calculator.ts'
import type { Notifier } from '../services/notifier.ts'
import type { PdfWriter } from '../services/pdf-writer.ts'
import type { Money } from '../shop/money.ts'
import type { Order } from '../shop/order.ts'
import type { OrderId, OrderRepository } from './order-repository.ts'
import { OrderValidator } from './order-validator.ts'

export type OrderServices = {
  readonly orders: OrderRepository
  readonly notifier: Notifier
  readonly pdf: PdfWriter
}

export type PlacedOrder = {
  readonly orderId: OrderId
  readonly total: Money
}

export class OrderService {
  private readonly validator = new OrderValidator()
  private readonly calculator = new PriceCalculator()
  private readonly formatter = new InvoiceFormatter()
  private readonly pdfFormatter = new PdfInvoiceFormatter()
  private readonly orders: OrderRepository
  private readonly notifier: Notifier
  private readonly pdf: PdfWriter

  constructor({ orders, notifier, pdf }: OrderServices) {
    this.orders = orders
    this.notifier = notifier
    this.pdf = pdf
  }

  placeOrder(order: Order): PlacedOrder {
    this.validator.validate(order)
    const priced = this.calculator.price(order)
    const orderId = this.orders.add(order)
    this.notifier.notify(order.customer.email, this.formatter.format(orderId, priced))
    return { orderId, total: priced.total }
  }

  downloadInvoice(orderId: OrderId): Uint8Array {
    const order = this.orders.find(orderId)
    if (!order) throw new Error(`Unknown order ${orderId}`)
    return this.pdf.write(this.pdfFormatter.format(orderId, this.calculator.price(order)))
  }
}
