package pricing

import receipts.receiptFor
import shop.Order
import shop.OrderLine
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class ReceiptTest {
    @Test
    fun `lists every line and the total`() {
        val receipt = receiptFor(
            Order(ada, listOf(OrderLine("MUG-01", eur(1200), 2), OrderLine("TEA-GREEN", eur(850), 1)), "2026-11-20"),
        )

        assertEquals(
            listOf("2 x MUG-01: 24.00 EUR", "1 x TEA-GREEN: 8.50 EUR", "Total: 32.50 EUR").joinToString("\n"),
            receipt,
        )
    }

    @Test
    fun `shows each discount it applies`() {
        val expected = listOf(
            "1 x TEST-SKU: 120.00 EUR",
            "Member discount (10%): -12.00 EUR",
            "Bulk discount: -5.00 EUR",
            "Total: 103.00 EUR",
        )
        assertEquals(expected.joinToString("\n"), receiptFor(orderOf(grace, 12000)))
    }
}
