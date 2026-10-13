package calc

import kotlin.test.Ignore
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.fail

class CalcTest {
    @Test
    fun `divides evenly`() {
        println("dividing 9 by 3")
        assertEquals(3, divide(9, 3))
    }

    @Test
    fun `refuses to divide by zero`() {
        divide(1, 0)
    }

    @Test
    fun `explains a wrong quotient`() {
        assertEquals(4, divide(9, 3), "quotient of 9 by 3")
    }

    @Test
    fun `is not written yet`() {
        fail("not written yet")
    }

    @Ignore
    @Test
    fun `is ignored`() {
        assertEquals(1, 2)
    }
}

@Ignore
class IgnoredTest {
    @Test
    fun `never runs`() {
        fail("an ignored class ran")
    }
}
