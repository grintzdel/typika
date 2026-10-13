package pricing

import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class DiscountRulesTest {
    @Test
    fun `applies a rule it has never seen before`() {
        val everyOrder = DiscountRule { _, _ -> Discount("Welcome", eur(100)) }

        assertEquals(listOf(Discount("Welcome", eur(100))), discountsFor(orderOf(ada, 2000), listOf(everyOrder)))
    }

    @Test
    fun `skips the rules that do not apply`() {
        val never = DiscountRule { _, _ -> null }

        assertEquals(emptyList(), discountsFor(orderOf(ada, 2000), listOf(never)))
    }
}
