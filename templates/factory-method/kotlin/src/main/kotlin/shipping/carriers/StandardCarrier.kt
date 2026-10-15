package shipping.carriers

import shipping.Carrier
import shipping.TrackingNumbers
import shipping.parcels.StandardParcel
import shop.Order

class StandardCarrier(trackingNumbers: TrackingNumbers) : Carrier(trackingNumbers) {
    override fun createParcel(order: Order) = StandardParcel
}
