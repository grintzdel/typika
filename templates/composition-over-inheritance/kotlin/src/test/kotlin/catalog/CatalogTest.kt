package catalog

import shop.Money
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class CatalogTest {
    private data class Sheet(val price: Money, val shipping: ShippingMethod, val packaging: List<String>)

    private fun sheetOf(sku: Sku) = productBySku(sku).let { Sheet(it.price(), it.shippingMethod, it.packaging) }

    @Test
    fun `sells e-books without shipping or packaging`() {
        assertEquals(Sheet(eur(990), ShippingMethod.NONE, emptyList()), sheetOf("EBOOK-TEA"))
    }

    @Test
    fun `ships physical products as parcels, in a cardboard box`() {
        assertEquals(Sheet(eur(1200), ShippingMethod.PARCEL, listOf("cardboard box")), sheetOf("MUG-01"))
    }

    @Test
    fun `ships perishable products refrigerated, in an insulated box`() {
        assertEquals(Sheet(eur(890), ShippingMethod.REFRIGERATED, listOf("insulated box")), sheetOf("CHEESE-01"))
    }

    @Test
    fun `takes the discount off the price of a discounted product`() {
        assertEquals(Sheet(eur(315), ShippingMethod.REFRIGERATED, listOf("insulated box")), sheetOf("YOGURT-01"))
    }

    @Test
    fun `refuses an unknown product`() {
        val error = assertFailsWith<IllegalArgumentException> { productBySku("NOPE-01") }
        assertEquals("Unknown product NOPE-01", error.message)
    }
}
