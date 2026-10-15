package shipping.parcels

import shipping.Parcel
import shop.Order

object ExpressParcel : Parcel {
    override val trackingPrefix = "EXP"
    override val deliveryDays = 1

    override fun labelFor(order: Order, trackingNumber: String) =
        "EXPRESS $trackingNumber for ${order.customer.name}, signature required"
}
