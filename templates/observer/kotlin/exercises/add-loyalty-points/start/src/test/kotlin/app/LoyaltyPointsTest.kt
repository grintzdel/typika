package app

import shop.ada
import shop.grace
import shop.orderOf
import kotlin.test.Test
import kotlin.test.assertEquals

class LoyaltyPointsTest {
    @Test
    fun `awards members one point per full euro while a campaign runs`() {
        val services = FakeServices()
        val shop = services.open()

        shop.startLoyaltyCampaign()
        shop.placeOrder(orderOf(grace, 5990))

        assertEquals(listOf(Award("grace@example.com", 59)), services.loyalty.awarded)
    }

    @Test
    fun `awards no points to regular customers`() {
        val services = FakeServices()
        val shop = services.open()

        shop.startLoyaltyCampaign()
        shop.placeOrder(orderOf(ada, 5990))

        assertEquals(emptyList(), services.loyalty.awarded)
    }

    @Test
    fun `awards no points before a campaign starts`() {
        val services = FakeServices()

        services.open().placeOrder(orderOf(grace, 5990))

        assertEquals(emptyList(), services.loyalty.awarded)
    }

    @Test
    fun `stops awarding points once the campaign ends`() {
        val services = FakeServices()
        val shop = services.open()

        val endCampaign = shop.startLoyaltyCampaign()
        shop.placeOrder(orderOf(grace, 2000))
        endCampaign()
        shop.placeOrder(orderOf(grace, 3000))

        assertEquals(listOf(Award("grace@example.com", 20)), services.loyalty.awarded)
    }

    @Test
    fun `keeps confirming orders while a campaign runs`() {
        val services = FakeServices()
        val shop = services.open()

        shop.startLoyaltyCampaign()
        shop.placeOrder(orderOf(grace, 5990))

        assertEquals(listOf(Email("grace@example.com", "Order order-1 confirmed: 59.90 EUR")), services.notifier.sent)
    }
}
