package shipping

import shipping.parcels.ExpressParcel
import shipping.parcels.StandardParcel
import shop.Order

private const val EXPRESS_MAX_GRAMS = 10_000

class ShippingDesk(private val trackingNumbers: TrackingNumbers) {
    fun ship(order: Order, carrier: CarrierName): Shipment {
        require(order.lines.isNotEmpty()) { "Cannot ship an empty order" }

        val parcel = when (carrier) {
            CarrierName.STANDARD -> StandardParcel
            CarrierName.EXPRESS -> {
                require(order.weightGrams <= EXPRESS_MAX_GRAMS) { "Too heavy for express shipping" }
                ExpressParcel
            }
        }

        val trackingNumber = trackingNumbers.next(parcel.trackingPrefix)
        return Shipment(trackingNumber, parcel.labelFor(order, trackingNumber), parcel.deliveryDays)
    }
}
