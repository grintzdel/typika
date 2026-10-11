import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { money } from '../src/shop/money.ts'
import { fakeServices } from './services-fixture.ts'

describe('payments', () => {
  it('charges a card', () => {
    const services = fakeServices()

    const payment = openShop(services).checkout.pay('card', money(5990))

    expect(payment).toEqual({ id: 'card-1', method: 'card', amount: money(5990) })
    expect(services.ledger.entries).toEqual(['card: charged 59.90 EUR'])
  })

  it('requests a bank transfer', () => {
    const services = fakeServices()

    const payment = openShop(services).checkout.pay('bank-transfer', money(3250))

    expect(payment).toEqual({ id: 'transfer-1', method: 'bank-transfer', amount: money(3250) })
    expect(services.ledger.entries).toEqual(['bank transfer: requested 32.50 EUR'])
  })

  it('refunds a payment through the method that took it', () => {
    const services = fakeServices()
    const shop = openShop(services)

    shop.refunds.refund(shop.checkout.pay('card', money(5990)))
    shop.refunds.refund(shop.checkout.pay('bank-transfer', money(3250)))

    expect(services.ledger.entries).toEqual([
      'card: charged 59.90 EUR',
      'card: refunded 59.90 EUR of card-1',
      'bank transfer: requested 32.50 EUR',
      'bank transfer: sent back 32.50 EUR of transfer-1',
    ])
  })

  it('saves a card and keeps only its last four digits in the token', () => {
    const services = fakeServices()

    const token = openShop(services).wallet.saveCard('grace@example.com', '4242424242424242')

    expect(token).toBe('tok-4242')
    expect(services.ledger.entries).toEqual(['card: saved tok-4242 for grace@example.com'])
  })

  it('subscribes a saved card to the tea club at 9.90 EUR a month', () => {
    const services = fakeServices()

    openShop(services).teaClub.join('tok-4242')

    expect(services.ledger.entries).toEqual(['card: subscribed tok-4242 to 9.90 EUR a month'])
  })
})
