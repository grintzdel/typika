package shipping.parcels

import shipping.Parcel
import shop.Order

object LockerParcel : Parcel {
    override val trackingPrefix = "LCK"
    override val deliveryDays = 2

    override fun labelFor(order: Order, trackingNumber: String) =
        "LOCKER $trackingNumber for ${order.customer.name}, collect within 7 days"
}
