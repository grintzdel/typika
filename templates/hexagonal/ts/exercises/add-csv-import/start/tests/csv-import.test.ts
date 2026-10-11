import { describe, expect, it } from 'vitest'
import { openShop } from '../src/open-shop.ts'
import { get } from './shop-fixture.ts'

const HEADER = 'email,name,sku,unitPriceCents,quantity'

const csvOf = (...rows: string[]) => [HEADER, ...rows].join('\n')

describe('CSV import', () => {
  it('places one order per row', () => {
    const shop = openShop()

    const report = shop.csvImport.importOrders(
      csvOf('ada@example.com,Ada,MUG-01,1200,2', 'grace@example.com,Grace,KETTLE-01,5990,1')
    )

    expect(report).toEqual({ imported: ['order-1', 'order-2'], rejectedLines: [] })
    expect(get(shop, '/orders/order-2').body).toEqual({
      orderId: 'order-2',
      status: 'pending',
      customerEmail: 'grace@example.com',
      totalCents: 5990,
    })
  })

  it('confirms and announces imported orders like any other order', () => {
    const shop = openShop()

    shop.csvImport.importOrders(csvOf('ada@example.com,Ada,MUG-01,1200,2'))

    expect(shop.mailer.sent).toEqual([
      {
        to: 'ada@example.com',
        subject: 'Order order-1 confirmed',
        body: 'Hello Ada, we received your order of 24.00 EUR.',
      },
    ])
    expect(shop.broker.published.map((message) => message.topic)).toEqual(['OrderPlaced'])
  })

  it('rejects the rows the shop would refuse and imports the others', () => {
    const shop = openShop()

    const report = shop.csvImport.importOrders(
      csvOf(
        'ada@example.com,Ada,MUG-01,1200,2',
        'grace@example.com,Grace,KETTLE-01,5990,0',
        'grace,Grace,KETTLE-01,5990,1',
        'grace@example.com,Grace,TEA-GREEN,850,3'
      )
    )

    expect(report).toEqual({ imported: ['order-1', 'order-2'], rejectedLines: [3, 4] })
    expect(shop.mailer.sent).toHaveLength(2)
  })
})
