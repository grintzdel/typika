package shipping

import shop.Order

interface Parcel {
    val trackingPrefix: String
    val deliveryDays: Int

    fun labelFor(order: Order, trackingNumber: String): String
}

data class Shipment(val trackingNumber: String, val label: String, val deliveryDays: Int)
