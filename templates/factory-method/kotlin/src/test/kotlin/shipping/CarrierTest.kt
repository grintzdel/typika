package shipping

import shop.Order
import kotlin.test.Test
import kotlin.test.assertEquals

private class TestCarrier : Carrier(SequentialTrackingNumbers()) {
    override fun createParcel(order: Order) = object : Parcel {
        override val trackingPrefix = "TST"
        override val deliveryDays = 7

        override fun labelFor(order: Order, trackingNumber: String) = "$trackingNumber ${order.customer.name}"
    }
}

class CarrierTest {
    @Test
    fun `ships whatever parcel its subclass creates`() {
        assertEquals(Shipment("TST-0001", "TST-0001 Ada", 7), TestCarrier().ship(orderOf(800)))
    }
}
