package checkout

import infrastructure.InMemoryOrderStore
import shop.grace
import shop.orderOf
import kotlin.test.Test
import kotlin.test.assertEquals

class CheckoutServiceTest {
    @Test
    fun `works with any notifier it is given`() {
        val recipients = mutableListOf<String>()
        val notifier = Notifier { recipient, _ -> recipients += recipient }

        CheckoutService(InMemoryOrderStore(), notifier).placeOrder(orderOf(grace, 5990))

        assertEquals(listOf("grace@example.com"), recipients)
    }
}
