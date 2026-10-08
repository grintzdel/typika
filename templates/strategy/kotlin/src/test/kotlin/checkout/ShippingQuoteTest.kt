package checkout

import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class ShippingQuoteTest {
    @Test
    fun `uses whichever shipping cost it is given`() {
        val flatRate = ShippingCost { eur(100) }

        val quote = ShippingQuote(flatRate).quote(orderOf(subtotalCents = 2000, weightGrams = 500))

        assertEquals(Quote(subtotal = eur(2000), shipping = eur(100), total = eur(2100)), quote)
    }
}
