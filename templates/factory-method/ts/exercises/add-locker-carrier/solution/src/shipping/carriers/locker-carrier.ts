import { weightOf, type Order } from '../../shop/order.ts'
import { Carrier } from '../carrier.ts'
import type { Parcel } from '../parcel.ts'
import { LockerParcel } from '../parcels/locker-parcel.ts'

const LOCKER_MAX_GRAMS = 20_000

export class LockerCarrier extends Carrier {
  protected createParcel(order: Order): Parcel {
    if (weightOf(order) > LOCKER_MAX_GRAMS) throw new Error('Too heavy for a locker')
    return new LockerParcel()
  }
}
