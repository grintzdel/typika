import { describe, expect, it, vi } from 'vitest'
import { CheckoutService } from '../src/checkout/checkout-service.ts'
import { InMemoryOrderStore } from '../src/infrastructure/in-memory-order-store.ts'
import { grace, orderOf } from './order-fixture.ts'

describe('order confirmation, without SMTP', () => {
  it('confirms the order to the customer with its total', () => {
    const notifier = { notify: vi.fn() }
    const checkout = new CheckoutService({ orders: new InMemoryOrderStore(), notifier })

    checkout.placeOrder(orderOf(grace, 5990))

    expect(notifier.notify).toHaveBeenCalledWith('grace@example.com', 'Order order-1 confirmed: 59.90 EUR')
  })

  it('saves the order in the store it is given', () => {
    const orders = new InMemoryOrderStore()
    const order = orderOf(grace, 5990)

    new CheckoutService({ orders, notifier: { notify: vi.fn() } }).placeOrder(order)

    expect(orders.find('order-1')).toEqual(order)
  })

  it('does not confirm an order that could not be saved', () => {
    const notifier = { notify: vi.fn() }
    const unavailable = {
      add: () => {
        throw new Error('Database unavailable')
      },
      find: () => undefined,
    }
    const checkout = new CheckoutService({ orders: unavailable, notifier })

    expect(() => checkout.placeOrder(orderOf(grace, 5990))).toThrow('Database unavailable')
    expect(notifier.notify).not.toHaveBeenCalled()
  })
})
