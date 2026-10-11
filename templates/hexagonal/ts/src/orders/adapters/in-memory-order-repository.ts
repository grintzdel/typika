import type { InMemoryDatabase, OrderRow } from '../../infrastructure/in-memory-database.ts'
import { money } from '../../shop/money.ts'
import type { Order, OrderId, UnsavedOrder } from '../domain/order.ts'
import type { OrderRepository } from '../ports.ts'

const toRow = ({ customer, lines, total, ...order }: Order): OrderRow => ({
  ...order,
  customerEmail: customer.email,
  customerName: customer.name,
  lines: lines.map(({ sku, unitPrice, quantity }) => ({ sku, unitPriceCents: unitPrice.cents, quantity })),
  totalCents: total.cents,
})

const toOrder = ({ customerEmail, customerName, lines, totalCents, ...row }: OrderRow): Order => ({
  ...row,
  customer: { name: customerName, email: customerEmail },
  lines: lines.map(({ sku, unitPriceCents, quantity }) => ({ sku, unitPrice: money(unitPriceCents), quantity })),
  total: money(totalCents),
})

export class InMemoryOrderRepository implements OrderRepository {
  private readonly db: InMemoryDatabase

  constructor(db: InMemoryDatabase) {
    this.db = db
  }

  add(unsaved: UnsavedOrder): Order {
    const order = { ...unsaved, id: this.db.nextOrderId() }
    this.db.orders.set(order.id, toRow(order))
    return order
  }

  update(order: Order): void {
    this.db.orders.set(order.id, toRow(order))
  }

  find(id: OrderId): Order | undefined {
    const row = this.db.orders.get(id)
    return row === undefined ? undefined : toOrder(row)
  }

  findByCustomer(email: string): readonly Order[] {
    return [...this.db.orders.values()].filter((row) => row.customerEmail === email).map(toOrder)
  }
}
