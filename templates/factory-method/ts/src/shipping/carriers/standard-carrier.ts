import { Carrier } from '../carrier.ts'
import type { Parcel } from '../parcel.ts'
import { StandardParcel } from '../parcels/standard-parcel.ts'

export class StandardCarrier extends Carrier {
  protected createParcel(): Parcel {
    return new StandardParcel()
  }
}
