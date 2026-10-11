import type { Order } from '../../shop/order.ts'
import type { Parcel } from '../parcel.ts'

export class ExpressParcel implements Parcel {
  readonly trackingPrefix = 'EXP'
  readonly deliveryDays = 1

  labelFor(order: Order, trackingNumber: string): string {
    return `EXPRESS ${trackingNumber} for ${order.customer.name}, signature required`
  }
}
