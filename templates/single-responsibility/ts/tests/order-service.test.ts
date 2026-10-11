import { describe, expect, it } from 'vitest'
import { InvalidOrderError } from '../src/orders/invalid-order-error.ts'
import { OrderService } from '../src/orders/order-service.ts'
import { money } from '../src/shop/money.ts'
import { ada, grace, orderOf } from './order-fixture.ts'
import { fakeServices } from './services-fixture.ts'

describe('placing an order', () => {
  it('gives every order its own id', () => {
    const orderService = new OrderService(fakeServices())

    expect(orderService.placeOrder(orderOf(ada, 1000)).orderId).toBe('order-1')
    expect(orderService.placeOrder(orderOf(grace, 2000)).orderId).toBe('order-2')
  })

  it('emails the customer an itemised invoice', () => {
    const services = fakeServices()

    new OrderService(services).placeOrder({
      customer: ada,
      lines: [
        { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
        { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
      ],
    })

    expect(services.notifier.notify).toHaveBeenCalledWith(
      'ada@example.com',
      ['Invoice order-1', '2 x MUG-01: 24.00 EUR', '1 x TEA-GREEN: 8.50 EUR', 'Shipping: 4.90 EUR', 'Total: 37.40 EUR'].join(
        '\n'
      )
    )
  })

  it('takes 10% off for members and ships free from 50.00 EUR', () => {
    const services = fakeServices()

    const placed = new OrderService(services).placeOrder(orderOf(grace, 5990))

    expect(placed.total).toEqual(money(5391))
    expect(services.notifier.notify).toHaveBeenCalledWith(
      'grace@example.com',
      [
        'Invoice order-1',
        '1 x TEST-SKU: 59.90 EUR',
        'Member discount: -5.99 EUR',
        'Shipping: 0.00 EUR',
        'Total: 53.91 EUR',
      ].join('\n')
    )
  })

  it('charges shipping when the discount brings the order under 50.00 EUR', () => {
    const placed = new OrderService(fakeServices()).placeOrder(orderOf(grace, 5200))

    expect(placed.total).toEqual(money(4680 + 490))
  })

  it('refuses an order without lines', () => {
    const orderService = new OrderService(fakeServices())

    expect(() => orderService.placeOrder({ customer: ada, lines: [] })).toThrow(InvalidOrderError)
  })

  it('refuses a quantity below one', () => {
    const orderService = new OrderService(fakeServices())
    const order = { customer: ada, lines: [{ sku: 'MUG-01', unitPrice: money(1200), quantity: 0 }] }

    expect(() => orderService.placeOrder(order)).toThrow('Invalid quantity for MUG-01: 0')
  })

  it('neither saves nor emails an invalid order', () => {
    const services = fakeServices()
    const orderService = new OrderService(services)

    expect(() => orderService.placeOrder(orderOf({ ...ada, email: 'ada' }, 1000))).toThrow(InvalidOrderError)

    expect(services.notifier.notify).not.toHaveBeenCalled()
    expect(orderService.placeOrder(orderOf(ada, 1000)).orderId).toBe('order-1')
  })
})
