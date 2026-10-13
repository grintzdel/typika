package pricing

import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class PricingTest {
    @Test
    fun `charges a regular customer the full price`() {
        assertEquals(eur(4000), totalOf(orderOf(ada, 4000)))
    }

    @Test
    fun `takes 10% off for members`() {
        assertEquals(eur(3600), totalOf(orderOf(grace, 4000)))
    }

    @Test
    fun `takes 5,00 EUR off from 100,00 EUR`() {
        assertEquals(eur(9500), totalOf(orderOf(ada, 10000)))
    }

    @Test
    fun `applies the member and bulk discounts together`() {
        assertEquals(eur(12000 - 1200 - 500), totalOf(orderOf(grace, 12000)))
    }

    @Test
    fun `computes both discounts on the full price`() {
        assertEquals(eur(10500 - 1050 - 500), totalOf(orderOf(grace, 10500)))
    }
}
