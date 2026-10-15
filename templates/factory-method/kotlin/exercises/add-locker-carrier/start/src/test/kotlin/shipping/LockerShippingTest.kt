package shipping

import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull

class LockerShippingTest {
    private val locker
        get() = assertNotNull(CarrierName.entries.find { it.label == "locker" }, "no carrier is labelled locker")

    @Test
    fun `is offered next to the other carriers`() {
        assertContains(CarrierName.entries.map { it.label }, "locker")
    }

    @Test
    fun `ships a parcel to collect from a locker, delivered in 2 days`() {
        assertEquals(
            Shipment("LCK-0001", "LOCKER LCK-0001 for Ada, collect within 7 days", 2),
            openDesk().ship(orderOf(800), locker),
        )
    }

    @Test
    fun `takes parcels too heavy for express`() {
        assertEquals("LCK-0001", openDesk().ship(orderOf(15_000), locker).trackingNumber)
    }

    @Test
    fun `refuses parcels over 20 kg`() {
        val carrier = locker

        val error = assertFailsWith<IllegalArgumentException> { openDesk().ship(orderOf(20_001), carrier) }

        assertEquals("Too heavy for a locker", error.message)
    }

    @Test
    fun `does not use up a tracking number on a refused parcel`() {
        val desk = openDesk()
        val carrier = locker
        assertFailsWith<IllegalArgumentException> { desk.ship(orderOf(20_001), carrier) }

        assertEquals("LCK-0001", desk.ship(orderOf(800), carrier).trackingNumber)
    }
}
