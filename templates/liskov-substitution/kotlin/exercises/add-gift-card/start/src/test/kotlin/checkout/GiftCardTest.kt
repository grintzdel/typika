package checkout

import catalog.ADDRESS
import catalog.GiftCard
import catalog.mug
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

private fun giftCard() = GiftCard("GIFT-25", "Gift card 25 EUR", eur(2500))

class GiftCardTest {
    @Test
    fun `charges a gift card at its price, without shipping`() {
        val result = checkout(listOf(giftCard()), ADDRESS)

        assertEquals(eur(0), result.shipping)
        assertEquals(eur(2500), result.total)
    }

    @Test
    fun `ships nothing for a gift card`() {
        assertEquals(emptyList(), checkout(listOf(giftCard()), ADDRESS).parcels)
    }

    @Test
    fun `gives no download link for a gift card`() {
        assertEquals(emptyList(), checkout(listOf(giftCard()), ADDRESS).downloads)
    }

    @Test
    fun `still ships the rest of the cart`() {
        val result = checkout(listOf(mug(), giftCard()), ADDRESS)

        assertEquals(listOf("MUG-01"), result.parcels.map { it.sku })
        assertEquals(eur(1200 + 2500 + 490), result.total)
    }
}
