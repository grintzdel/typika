package shipping.carriers

import shipping.Carrier
import shipping.TrackingNumbers
import shipping.parcels.ExpressParcel
import shop.Order

private const val EXPRESS_MAX_GRAMS = 10_000

// #region tour:concrete
class ExpressCarrier(trackingNumbers: TrackingNumbers) : Carrier(trackingNumbers) {
    override fun createParcel(order: Order): ExpressParcel {
        require(order.weightGrams <= EXPRESS_MAX_GRAMS) { "Too heavy for express shipping" }
        return ExpressParcel
    }
}
// #endregion
