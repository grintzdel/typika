import { describe, expect, it } from 'vitest'
import { Carrier } from '../src/shipping/carrier.ts'
import type { Parcel } from '../src/shipping/parcel.ts'
import { SequentialTrackingNumbers } from '../src/shipping/tracking-numbers.ts'
import { orderOf } from './order-fixture.ts'

class TestCarrier extends Carrier {
  protected createParcel(): Parcel {
    return { trackingPrefix: 'TST', deliveryDays: 7, labelFor: (order, number) => `${number} ${order.customer.name}` }
  }
}

describe('Carrier', () => {
  it('ships whatever parcel its subclass creates', () => {
    const shipment = new TestCarrier(new SequentialTrackingNumbers()).ship(orderOf(800))

    expect(shipment).toEqual({ trackingNumber: 'TST-0001', label: 'TST-0001 Ada', deliveryDays: 7 })
  })
})
