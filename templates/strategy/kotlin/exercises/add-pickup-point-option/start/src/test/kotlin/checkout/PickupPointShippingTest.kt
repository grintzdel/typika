package checkout

import shop.Tier
import shop.eur
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class PickupPointShippingTest {
    private val pickupPoint
        get() = assertNotNull(
            ShippingOption.entries.find { it.label == "pickup-point" },
            "no shipping option is labelled pickup-point",
        )

    @Test
    fun `is offered next to the other shipping options`() {
        assertContains(ShippingOption.entries.map { it.label }, "pickup-point")
    }

    @Test
    fun `charges a flat 2,90, whatever the weight`() {
        val light = quoteShipping(orderOf(subtotalCents = 1000, weightGrams = 500), pickupPoint)
        val heavy = quoteShipping(orderOf(subtotalCents = 1000, weightGrams = 9000), pickupPoint)

        assertEquals(eur(290), light.shipping)
        assertEquals(eur(290), heavy.shipping)
    }

    @Test
    fun `is free from 25,00`() {
        val quote = quoteShipping(orderOf(subtotalCents = 2500, weightGrams = 500), pickupPoint)

        assertEquals(eur(0), quote.shipping)
    }

    @Test
    fun `is always free for members`() {
        val order = orderOf(subtotalCents = 800, weightGrams = 500, tier = Tier.MEMBER)

        assertEquals(eur(0), quoteShipping(order, pickupPoint).shipping)
    }

    @Test
    fun `leaves standard shipping unchanged between 25,00 and 50,00`() {
        val quote = quoteShipping(orderOf(subtotalCents = 3000, weightGrams = 500), ShippingOption.STANDARD)

        assertEquals(eur(490), quote.shipping)
    }

    @Test
    fun `leaves express shipping paid for members under 50,00`() {
        val order = orderOf(subtotalCents = 800, weightGrams = 500, tier = Tier.MEMBER)

        assertEquals(eur(1290), quoteShipping(order, ShippingOption.EXPRESS).shipping)
    }
}
