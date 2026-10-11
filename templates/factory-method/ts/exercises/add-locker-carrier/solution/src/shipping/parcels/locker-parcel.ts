import type { Order } from '../../shop/order.ts'
import type { Parcel } from '../parcel.ts'

export class LockerParcel implements Parcel {
  readonly trackingPrefix = 'LCK'
  readonly deliveryDays = 2

  labelFor(order: Order, trackingNumber: string): string {
    return `LOCKER ${trackingNumber} for ${order.customer.name}, collect within 7 days`
  }
}
