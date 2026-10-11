import { weightOf, type Order } from '../../shop/order.ts'
import { Carrier } from '../carrier.ts'
import type { Parcel } from '../parcel.ts'
import { ExpressParcel } from '../parcels/express-parcel.ts'

const EXPRESS_MAX_GRAMS = 10_000

// #region tour:concrete
export class ExpressCarrier extends Carrier {
  protected createParcel(order: Order): Parcel {
    if (weightOf(order) > EXPRESS_MAX_GRAMS) throw new Error('Too heavy for express shipping')
    return new ExpressParcel()
  }
}
// #endregion
