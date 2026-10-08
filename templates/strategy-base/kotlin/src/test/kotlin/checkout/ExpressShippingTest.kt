package checkout

import shop.Tier
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class ExpressShippingTest {
    @Test
    fun `charges 12,90 for orders up to 2 kg`() {
        val quote = quoteShipping(orderOf(subtotalCents = 3000, weightGrams = 1500), ShippingOption.EXPRESS)

        assertEquals(eur(1290), quote.shipping)
    }

    @Test
    fun `charges 18,90 for orders over 2 kg`() {
        val quote = quoteShipping(orderOf(subtotalCents = 3000, weightGrams = 2500), ShippingOption.EXPRESS)

        assertEquals(eur(1890), quote.shipping)
    }

    @Test
    fun `is never free for regular customers`() {
        val quote = quoteShipping(orderOf(subtotalCents = 20000, weightGrams = 1000), ShippingOption.EXPRESS)

        assertEquals(eur(1290), quote.shipping)
    }

    @Test
    fun `is free for members from 50,00`() {
        val order = orderOf(subtotalCents = 5000, weightGrams = 2500, tier = Tier.MEMBER)

        assertEquals(eur(0), quoteShipping(order, ShippingOption.EXPRESS).shipping)
    }

    @Test
    fun `is paid by members under 50,00`() {
        val order = orderOf(subtotalCents = 4999, weightGrams = 1000, tier = Tier.MEMBER)

        assertEquals(eur(1290), quoteShipping(order, ShippingOption.EXPRESS).shipping)
    }
}
