import { weightOf, type Order } from '../shop/order.ts'
import type { CarrierName } from './carrier-name.ts'
import type { Parcel, Shipment } from './parcel.ts'
import { ExpressParcel } from './parcels/express-parcel.ts'
import { StandardParcel } from './parcels/standard-parcel.ts'
import type { TrackingNumbers } from './tracking-numbers.ts'

const EXPRESS_MAX_GRAMS = 10_000

export class ShippingDesk {
  private readonly trackingNumbers: TrackingNumbers

  constructor(trackingNumbers: TrackingNumbers) {
    this.trackingNumbers = trackingNumbers
  }

  ship(order: Order, carrier: CarrierName): Shipment {
    if (order.lines.length === 0) throw new Error('Cannot ship an empty order')

    let parcel: Parcel
    switch (carrier) {
      case 'standard':
        parcel = new StandardParcel()
        break
      case 'express':
        if (weightOf(order) > EXPRESS_MAX_GRAMS) throw new Error('Too heavy for express shipping')
        parcel = new ExpressParcel()
        break
    }

    const trackingNumber = this.trackingNumbers.next(parcel.trackingPrefix)
    return { trackingNumber, label: parcel.labelFor(order, trackingNumber), deliveryDays: parcel.deliveryDays }
  }
}
