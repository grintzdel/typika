package catalog

import shop.Money
import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class GiftWrapTest {
    private data class Sheet(val price: Money, val shipping: ShippingMethod, val packaging: List<String>)

    private fun sheetOf(sku: Sku) = productBySku(sku).let { Sheet(it.price(), it.shippingMethod, it.packaging) }

    @Test
    fun `wraps a physical product for 3,50 more`() {
        assertEquals(
            Sheet(eur(1550), ShippingMethod.PARCEL, listOf("cardboard box", "gift wrap")),
            sheetOf("MUG-01-GIFT"),
        )
    }

    @Test
    fun `wraps a perishable product, still shipped refrigerated`() {
        assertEquals(
            Sheet(eur(1240), ShippingMethod.REFRIGERATED, listOf("insulated box", "gift wrap")),
            sheetOf("CHEESE-01-GIFT"),
        )
    }

    @Test
    fun `adds the fee after the discount of a discounted product`() {
        assertEquals(
            Sheet(eur(1470), ShippingMethod.PARCEL, listOf("cardboard box", "gift wrap")),
            sheetOf("MUG-02-GIFT"),
        )
    }

    @Test
    fun `leaves the products without gift wrap unchanged`() {
        assertEquals(Sheet(eur(1200), ShippingMethod.PARCEL, listOf("cardboard box")), sheetOf("MUG-01"))
    }
}
