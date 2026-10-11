import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { money } from '../src/shop/money.ts'
import { fakeServices } from './services-fixture.ts'

describe('gift card payment', () => {
  it('pays through the gift card partner', () => {
    const services = fakeServices()

    const payment = openShop(services).checkout.pay('gift-card', money(2500))

    expect(services.giftCards.redeem).toHaveBeenCalledWith(money(2500))
    expect(payment).toEqual({ id: 'gift-1', method: 'gift-card', amount: money(2500) })
  })

  it('records the payment in the ledger', () => {
    const services = fakeServices()

    openShop(services).checkout.pay('gift-card', money(2500))

    expect(services.ledger.entries).toEqual(['gift card: redeemed 25.00 EUR'])
  })

  it('lets the partner refuse a payment', () => {
    const services = fakeServices()
    services.giftCards.redeem.mockImplementation(() => {
      throw new Error('Gift card balance too low')
    })

    expect(() => openShop(services).checkout.pay('gift-card', money(2500))).toThrow('Gift card balance too low')
    expect(services.ledger.entries).toEqual([])
  })

  it('refuses to refund a gift card payment', () => {
    const shop = openShop(fakeServices())
    const payment = shop.checkout.pay('gift-card', money(2500))

    expect(() => shop.refunds.refund(payment)).toThrow('Payments by gift-card cannot be refunded')
  })

  it('keeps refunding card payments', () => {
    const services = fakeServices()
    const shop = openShop(services)

    shop.refunds.refund(shop.checkout.pay('card', money(5990)))

    expect(services.ledger.entries).toContain('card: refunded 59.90 EUR of card-1')
  })
})
