package calc

import kotlin.test.Test
import kotlin.test.assertEquals

class RoundingTest {
    @Test
    fun `rounds half up`() {
        assertEquals(50, roundToTens(45))
    }

    @Test
    fun `rounds down below half`() {
        assertEquals(40, roundToTens(46))
    }
}
