package checkout

import catalog.ADDRESS
import catalog.Parcel
import catalog.handbook
import catalog.kettle
import catalog.mug
import catalog.tea
import catalog.teaSet
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class CheckoutTest {
    @Test
    fun `charges the products and 4,90 EUR of shipping up to 2 kg`() {
        val result = checkout(listOf(mug(), tea()), ADDRESS)

        assertEquals(eur(490), result.shipping)
        assertEquals(eur(1200 + 850 + 490), result.total)
    }

    @Test
    fun `charges 9,90 EUR of shipping above 2 kg`() {
        assertEquals(eur(990), checkout(listOf(kettle(), kettle()), ADDRESS).shipping)
    }

    @Test
    fun `ships one parcel per physical product to the given address`() {
        assertEquals(
            listOf(Parcel("MUG-01", ADDRESS, 350), Parcel("TEA-GREEN", ADDRESS, 100)),
            checkout(listOf(mug(), tea()), ADDRESS).parcels,
        )
    }

    @Test
    fun `gives a download link for a digital product and charges no shipping`() {
        val result = checkout(listOf(handbook()), ADDRESS)

        assertEquals(listOf("https://shop.example/d/EBOOK-TEA"), result.downloads)
        assertEquals(emptyList(), result.parcels)
        assertEquals(eur(990), result.total)
    }

    @Test
    fun `ships the physical products of a mixed cart and links the digital ones`() {
        val result = checkout(listOf(mug(), handbook()), ADDRESS)

        assertEquals(listOf("MUG-01"), result.parcels.map { it.sku })
        assertEquals(1, result.downloads.size)
        assertEquals(eur(1200 + 990 + 490), result.total)
    }

    @Test
    fun `ships a bundle as one parcel`() {
        val result = checkout(listOf(teaSet()), ADDRESS)

        assertEquals(listOf("TEA-SET"), result.parcels.map { it.sku })
        assertEquals(eur(1800 + 490), result.total)
    }
}
