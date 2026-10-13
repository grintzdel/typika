package pricing

import receipts.receiptFor
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

private const val BLACK_FRIDAY = "2026-11-27"

class BlackFridayTest {
    @Test
    fun `takes 20% off orders placed on Black Friday`() {
        assertEquals(eur(3200), totalOf(orderOf(ada, 4000, BLACK_FRIDAY)))
    }

    @Test
    fun `adds up with the member discount`() {
        assertEquals(eur(4000 - 400 - 800), totalOf(orderOf(grace, 4000, BLACK_FRIDAY)))
    }

    @Test
    fun `adds up with the bulk discount, computed on the full price`() {
        assertEquals(eur(11000 - 500 - 2200), totalOf(orderOf(ada, 11000, BLACK_FRIDAY)))
    }

    @Test
    fun `gives nothing the day before or the day after`() {
        assertEquals(eur(4000), totalOf(orderOf(ada, 4000, "2026-11-26")))
        assertEquals(eur(4000), totalOf(orderOf(ada, 4000, "2026-11-28")))
    }

    @Test
    fun `shows the Black Friday discount on the receipt, after the other discounts`() {
        val expected = listOf(
            "1 x TEST-SKU: 40.00 EUR",
            "Member discount (10%): -4.00 EUR",
            "Black Friday (20%): -8.00 EUR",
            "Total: 28.00 EUR",
        )
        assertEquals(expected.joinToString("\n"), receiptFor(orderOf(grace, 4000, BLACK_FRIDAY)))
    }
}
