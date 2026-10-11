import { describe, expect, it } from 'vitest'
import { checkout } from '../src/checkout/checkout.ts'
import { money } from '../src/shop/money.ts'
import { ADDRESS, handbook, kettle, mug, tea, teaSet } from './catalog-fixture.ts'

describe('checkout', () => {
  it('charges the products and 4.90 EUR of shipping up to 2 kg', () => {
    const result = checkout([mug(), tea()], ADDRESS)

    expect(result.shipping).toEqual(money(490))
    expect(result.total).toEqual(money(1200 + 850 + 490))
  })

  it('charges 9.90 EUR of shipping above 2 kg', () => {
    expect(checkout([kettle(), kettle()], ADDRESS).shipping).toEqual(money(990))
  })

  it('ships one parcel per physical product to the given address', () => {
    expect(checkout([mug(), tea()], ADDRESS).parcels).toEqual([
      { sku: 'MUG-01', address: ADDRESS, weightInGrams: 350 },
      { sku: 'TEA-GREEN', address: ADDRESS, weightInGrams: 100 },
    ])
  })

  it('gives a download link for a digital product and charges no shipping', () => {
    const result = checkout([handbook()], ADDRESS)

    expect(result.downloads).toEqual(['https://shop.example/d/EBOOK-TEA'])
    expect(result.parcels).toEqual([])
    expect(result.total).toEqual(money(990))
  })

  it('ships the physical products of a mixed cart and links the digital ones', () => {
    const result = checkout([mug(), handbook()], ADDRESS)

    expect(result.parcels.map((parcel) => parcel.sku)).toEqual(['MUG-01'])
    expect(result.downloads).toHaveLength(1)
    expect(result.total).toEqual(money(1200 + 990 + 490))
  })

  it('ships a bundle as one parcel', () => {
    const result = checkout([teaSet()], ADDRESS)

    expect(result.parcels.map((parcel) => parcel.sku)).toEqual(['TEA-SET'])
    expect(result.total).toEqual(money(1800 + 490))
  })
})
