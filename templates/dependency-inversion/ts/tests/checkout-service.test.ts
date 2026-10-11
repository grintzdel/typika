import { describe, expect, it, vi } from 'vitest'
import { CheckoutService } from '../src/checkout/checkout-service.ts'
import { InMemoryOrderStore } from '../src/infrastructure/in-memory-order-store.ts'
import { grace, orderOf } from './order-fixture.ts'

describe('CheckoutService', () => {
  it('works with any notifier it is given', () => {
    const notifier = { notify: vi.fn() }

    new CheckoutService({ orders: new InMemoryOrderStore(), notifier }).placeOrder(orderOf(grace, 5990))

    expect(notifier.notify).toHaveBeenCalledTimes(1)
  })
})
