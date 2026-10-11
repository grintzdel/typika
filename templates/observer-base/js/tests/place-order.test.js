import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.js'
import { money } from '../src/shop/money.js'
import { ada, grace, orderOf } from './order-fixture.js'
import { fakeServices } from './services-fixture.js'

describe('placing an order', () => {
  it('gives every order its own id', () => {
    const shop = openShop(fakeServices())

    expect(shop.placeOrder(orderOf(ada, 1000))).toBe('order-1')
    expect(shop.placeOrder(orderOf(grace, 2000))).toBe('order-2')
  })

  it('reserves the stock of every line', () => {
    const services = fakeServices()
    const order = {
      customer: ada,
      lines: [
        { sku: 'MUG-01', unitPrice: money(1200), quantity: 2 },
        { sku: 'TEA-GREEN', unitPrice: money(850), quantity: 1 },
      ],
    }

    openShop(services).placeOrder(order)

    expect(services.stock.reserve).toHaveBeenCalledWith(order.lines)
  })

  it('emails the customer a confirmation with the order total', () => {
    const services = fakeServices()

    openShop(services).placeOrder(orderOf(grace, 5990))

    expect(services.notifier.notify).toHaveBeenCalledWith('grace@example.com', 'Order order-1 confirmed: 59.90 EUR')
  })

  it('tracks the sale in analytics', () => {
    const services = fakeServices()

    openShop(services).placeOrder(orderOf(ada, 3250))

    expect(services.analytics.track).toHaveBeenCalledWith('order_placed', { orderId: 'order-1', totalCents: 3250 })
  })

  it('reacts once to each order', () => {
    const services = fakeServices()
    const shop = openShop(services)

    shop.placeOrder(orderOf(ada, 1000))
    shop.placeOrder(orderOf(grace, 2000))

    expect(services.stock.reserve).toHaveBeenCalledTimes(2)
    expect(services.notifier.notify).toHaveBeenCalledTimes(2)
    expect(services.analytics.track).toHaveBeenCalledTimes(2)
  })
})
