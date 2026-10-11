import type { Order } from '../shop/order.ts'
import type { Parcel, Shipment } from './parcel.ts'
import type { TrackingNumbers } from './tracking-numbers.ts'

// #region tour:creator
export abstract class Carrier {
  private readonly trackingNumbers: TrackingNumbers

  constructor(trackingNumbers: TrackingNumbers) {
    this.trackingNumbers = trackingNumbers
  }

  ship(order: Order): Shipment {
    if (order.lines.length === 0) throw new Error('Cannot ship an empty order')

    const parcel = this.createParcel(order)
    const trackingNumber = this.trackingNumbers.next(parcel.trackingPrefix)
    return { trackingNumber, label: parcel.labelFor(order, trackingNumber), deliveryDays: parcel.deliveryDays }
  }

  // #region tour:factory-method
  protected abstract createParcel(order: Order): Parcel
  // #endregion
}
// #endregion
