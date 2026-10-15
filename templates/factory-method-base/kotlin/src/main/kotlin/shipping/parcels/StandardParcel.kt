package shipping.parcels

import shipping.Parcel
import shop.Order

object StandardParcel : Parcel {
    override val trackingPrefix = "STD"
    override val deliveryDays = 3

    override fun labelFor(order: Order, trackingNumber: String) = "STANDARD $trackingNumber for ${order.customer.name}"
}
