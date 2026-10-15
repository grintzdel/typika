package shipping

import shipping.carriers.ExpressCarrier
import shipping.carriers.LockerCarrier
import shipping.carriers.StandardCarrier
import shop.Order

class ShippingDesk(trackingNumbers: TrackingNumbers) {
    private val carriers = CarrierName.entries.associateWith { name ->
        when (name) {
            CarrierName.STANDARD -> StandardCarrier(trackingNumbers)
            CarrierName.EXPRESS -> ExpressCarrier(trackingNumbers)
            CarrierName.LOCKER -> LockerCarrier(trackingNumbers)
        }
    }

    fun ship(order: Order, carrier: CarrierName): Shipment = carriers.getValue(carrier).ship(order)
}
