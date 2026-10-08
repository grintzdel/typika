package checkout

import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class StandardShippingTest {
    @Test
    fun `charges 4,90 for orders up to 2 kg`() {
        val quote = quoteShipping(orderOf(subtotalCents = 3000, weightGrams = 2000), ShippingOption.STANDARD)

        assertEquals(eur(490), quote.shipping)
    }

    @Test
    fun `charges 6,90 for orders over 2 kg`() {
        val quote = quoteShipping(orderOf(subtotalCents = 3000, weightGrams = 2001), ShippingOption.STANDARD)

        assertEquals(eur(690), quote.shipping)
    }

    @Test
    fun `is free from 50,00, whatever the weight`() {
        val quote = quoteShipping(orderOf(subtotalCents = 5000, weightGrams = 9000), ShippingOption.STANDARD)

        assertEquals(eur(0), quote.shipping)
    }
}
