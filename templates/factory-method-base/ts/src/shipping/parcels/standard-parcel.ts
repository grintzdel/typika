import type { Order } from '../../shop/order.ts'
import type { Parcel } from '../parcel.ts'

export class StandardParcel implements Parcel {
  readonly trackingPrefix = 'STD'
  readonly deliveryDays = 3

  labelFor(order: Order, trackingNumber: string): string {
    return `STANDARD ${trackingNumber} for ${order.customer.name}`
  }
}
