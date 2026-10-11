import type { Order } from '../shop/order.ts'
import type { CarrierName } from './carrier-name.ts'
import type { Carrier } from './carrier.ts'
import { ExpressCarrier } from './carriers/express-carrier.ts'
import { StandardCarrier } from './carriers/standard-carrier.ts'
import type { Shipment } from './parcel.ts'
import type { TrackingNumbers } from './tracking-numbers.ts'

export class ShippingDesk {
  private readonly carriers: Record<CarrierName, Carrier>

  constructor(trackingNumbers: TrackingNumbers) {
    this.carriers = {
      standard: new StandardCarrier(trackingNumbers),
      express: new ExpressCarrier(trackingNumbers),
    }
  }

  ship(order: Order, carrier: CarrierName): Shipment {
    return this.carriers[carrier].ship(order)
  }
}
