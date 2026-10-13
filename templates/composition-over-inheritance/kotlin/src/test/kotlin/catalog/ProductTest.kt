package catalog

import shop.eur
import kotlin.test.Test
import kotlin.test.assertEquals

class ProductTest {
    @Test
    fun `combines any pricing with any shipping and packaging`() {
        val discountedEbook = Product(
            "EBOOK-SALE", "A discounted e-book", eur(1000),
            pricing = discounted(50), shipping = NoShipping, packaging = NoPackaging,
        )

        assertEquals(eur(500), discountedEbook.price())
        assertEquals(ShippingMethod.NONE, discountedEbook.shippingMethod)
    }
}
