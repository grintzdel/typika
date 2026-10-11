import { CARRIER_NAMES } from './shipping/carrier-name.ts'
import { ShippingDesk } from './shipping/shipping-desk.ts'
import { SequentialTrackingNumbers } from './shipping/tracking-numbers.ts'
import type { Order } from './shop/order.ts'

const desk = new ShippingDesk(new SequentialTrackingNumbers())

const orders: Order[] = [
  {
    customer: { name: 'Ada', tier: 'regular' },
    lines: [{ sku: 'MUG-01', quantity: 2, unitWeightGrams: 400 }],
  },
  {
    customer: { name: 'Grace', tier: 'member' },
    lines: [{ sku: 'BOOKSHELF-01', quantity: 1, unitWeightGrams: 18_000 }],
  },
]

for (const order of orders) {
  console.log(`${order.customer.name}'s order`)
  for (const carrier of CARRIER_NAMES) {
    try {
      const shipment = desk.ship(order, carrier)
      const days = shipment.deliveryDays === 1 ? '1 day' : `${shipment.deliveryDays} days`
      console.log(`  ${carrier.padEnd(10)} ${shipment.label}, delivered in ${days}`)
    } catch (error) {
      console.log(`  ${carrier.padEnd(10)} refused: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
