import { describe, expect, it } from 'vitest'
import { InMemoryDatabase } from '../src/infrastructure/in-memory-database.ts'
import { InMemoryOrderRepository } from '../src/orders/adapters/in-memory-order-repository.ts'
import { OrderConflictError } from '../src/orders/domain/order.ts'
import { OrderService } from '../src/orders/order-service.ts'
import type { OrderNotification } from '../src/orders/ports.ts'
import { money } from '../src/shop/money.ts'
import { ada, orderOf } from './shop-fixture.ts'

const serviceNotifying = (notifications: OrderNotification[]) =>
  new OrderService({
    orders: new InMemoryOrderRepository(new InMemoryDatabase()),
    payments: { charge: () => ({ status: 'approved', paymentId: 'pay-1' }), refund: () => undefined },
    notifier: { notify: (notification) => notifications.push(notification) },
    events: { publish: () => undefined },
    clock: { now: () => new Date('2026-10-01T09:00:00Z') },
  })

describe('OrderService', () => {
  it('places an order without any HTTP request', () => {
    const notifications: OrderNotification[] = []

    const order = serviceNotifying(notifications).placeOrder(orderOf(ada, 3250))

    expect(order.total).toEqual(money(3250))
    expect(notifications).toEqual([{ kind: 'order-confirmed', order }])
  })

  it('refuses to ship an unpaid order with a domain error', () => {
    const service = serviceNotifying([])
    const order = service.placeOrder(orderOf(ada, 3250))

    expect(() => service.shipOrder(order.id)).toThrow(OrderConflictError)
  })
})
