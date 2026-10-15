package shipping

import shop.Customer
import shop.Order
import shop.Tier
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ShippingDeskTest {
    @Test
    fun `standard ships a labelled parcel, delivered in 3 days`() {
        assertEquals(
            Shipment("STD-0001", "STANDARD STD-0001 for Ada", 3),
            openDesk().ship(orderOf(800), CarrierName.STANDARD),
        )
    }

    @Test
    fun `standard numbers its parcels in sequence`() {
        val desk = openDesk()
        desk.ship(orderOf(800), CarrierName.STANDARD)

        assertEquals("STD-0002", desk.ship(orderOf(800, "Grace"), CarrierName.STANDARD).trackingNumber)
    }

    @Test
    fun `standard takes heavy parcels`() {
        assertEquals("STD-0001", openDesk().ship(orderOf(30_000), CarrierName.STANDARD).trackingNumber)
    }

    @Test
    fun `express ships a parcel that needs a signature, delivered in 1 day`() {
        assertEquals(
            Shipment("EXP-0001", "EXPRESS EXP-0001 for Ada, signature required", 1),
            openDesk().ship(orderOf(800), CarrierName.EXPRESS),
        )
    }

    @Test
    fun `express numbers its parcels apart from standard ones`() {
        val desk = openDesk()
        desk.ship(orderOf(800), CarrierName.STANDARD)

        assertEquals("EXP-0001", desk.ship(orderOf(800), CarrierName.EXPRESS).trackingNumber)
    }

    @Test
    fun `express refuses parcels over 10 kg`() {
        val error = assertFailsWith<IllegalArgumentException> { openDesk().ship(orderOf(10_001), CarrierName.EXPRESS) }

        assertEquals("Too heavy for express shipping", error.message)
    }

    @Test
    fun `express does not use up a tracking number on a refused parcel`() {
        val desk = openDesk()
        assertFailsWith<IllegalArgumentException> { desk.ship(orderOf(10_001), CarrierName.EXPRESS) }

        assertEquals("EXP-0001", desk.ship(orderOf(800), CarrierName.EXPRESS).trackingNumber)
    }

    @Test
    fun `the desk refuses to ship an empty order`() {
        val empty = Order(Customer("Ada", Tier.REGULAR), emptyList())

        val error = assertFailsWith<IllegalArgumentException> { openDesk().ship(empty, CarrierName.STANDARD) }

        assertEquals("Cannot ship an empty order", error.message)
    }
}
