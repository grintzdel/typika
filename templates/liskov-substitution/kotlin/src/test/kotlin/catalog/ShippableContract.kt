package catalog

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

// #region tour:contract-tests
abstract class ShippableContract {
    abstract fun make(): Shippable

    @Test
    fun `weighs something`() {
        assertTrue(make().weightInGrams > 0)
    }

    @Test
    fun `ships a parcel that weighs what it announced`() {
        val product = make()

        assertEquals(product.weightInGrams, product.ship("12 rue des Lilas, Lyon").weightInGrams)
    }

    @Test
    fun `ships to the address it is given`() {
        assertEquals("3 Rosenweg, Berlin", make().ship("3 Rosenweg, Berlin").address)
    }
}
// #endregion
