import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { ada, orderOf, placeOrder } from './shop-fixture.ts'

describe('OutboxRelay', () => {
  it('keeps the event while the broker is down and publishes it once it is back', () => {
    const shop = openShop()
    shop.broker.goDown()
    placeOrder(shop, orderOf(ada, 3250))

    expect(shop.relay.publishPending()).toBe(0)
    shop.broker.comeBack()

    expect(shop.relay.publishPending()).toBe(1)
    expect(shop.relay.publishPending()).toBe(0)
    expect(shop.broker.published.map((message) => message.topic)).toEqual(['OrderPlaced'])
  })
})
