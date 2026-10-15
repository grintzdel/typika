package shipping

import shop.Order

// #region tour:creator
abstract class Carrier(private val trackingNumbers: TrackingNumbers) {
    fun ship(order: Order): Shipment {
        require(order.lines.isNotEmpty()) { "Cannot ship an empty order" }

        val parcel = createParcel(order)
        val trackingNumber = trackingNumbers.next(parcel.trackingPrefix)
        return Shipment(trackingNumber, parcel.labelFor(order, trackingNumber), parcel.deliveryDays)
    }

    // #region tour:factory-method
    protected abstract fun createParcel(order: Order): Parcel
    // #endregion
}
// #endregion
