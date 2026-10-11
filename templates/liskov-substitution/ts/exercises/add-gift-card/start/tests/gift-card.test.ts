import { describe, expect, it } from 'vitest'
import { GiftCard } from '../src/catalog/gift-card.ts'
import { checkout } from '../src/checkout/checkout.ts'
import { money } from '../src/shop/money.ts'
import { ADDRESS, mug } from './catalog-fixture.ts'

const giftCard = () => new GiftCard('GIFT-25', 'Gift card 25 EUR', money(2500))

describe('gift card', () => {
  it('charges a gift card at its price, without shipping', () => {
    const result = checkout([giftCard()], ADDRESS)

    expect(result.shipping).toEqual(money(0))
    expect(result.total).toEqual(money(2500))
  })

  it('ships nothing for a gift card', () => {
    expect(checkout([giftCard()], ADDRESS).parcels).toEqual([])
  })

  it('gives no download link for a gift card', () => {
    expect(checkout([giftCard()], ADDRESS).downloads).toEqual([])
  })

  it('still ships the rest of the cart', () => {
    const result = checkout([mug(), giftCard()], ADDRESS)

    expect(result.parcels.map((parcel) => parcel.sku)).toEqual(['MUG-01'])
    expect(result.total).toEqual(money(1200 + 2500 + 490))
  })
})
