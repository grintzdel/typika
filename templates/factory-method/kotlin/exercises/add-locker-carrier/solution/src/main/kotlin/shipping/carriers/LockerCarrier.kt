package shipping.carriers

import shipping.Carrier
import shipping.TrackingNumbers
import shipping.parcels.LockerParcel
import shop.Order

private const val LOCKER_MAX_GRAMS = 20_000

class LockerCarrier(trackingNumbers: TrackingNumbers) : Carrier(trackingNumbers) {
    override fun createParcel(order: Order): LockerParcel {
        require(order.weightGrams <= LOCKER_MAX_GRAMS) { "Too heavy for a locker" }
        return LockerParcel
    }
}
