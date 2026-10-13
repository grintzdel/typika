import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.fail

class AssertionsTest {
    private val nothing: String? = null
    private val something: String? = "tea"

    @Test
    fun `assertEquals without message`() = assertEquals(1, 2)

    @Test
    fun `assertEquals with message`() = assertEquals(1, 2, "counts differ")

    @Test
    fun `assertNotEquals without message`() = assertNotEquals(1, 1)

    @Test
    fun `assertNotEquals with message`() = assertNotEquals(1, 1, "counts match")

    @Test
    fun `assertTrue without message`() = assertTrue(1 > 2)

    @Test
    fun `assertTrue with message`() = assertTrue(1 > 2, "not greater")

    @Test
    fun `assertFalse without message`() = assertFalse(2 > 1)

    @Test
    fun `assertFalse with message`() = assertFalse(2 > 1, "greater")

    @Test
    fun `assertNull without message`() = assertNull(something)

    @Test
    fun `assertNotNull without message`() {
        assertNotNull(nothing)
    }

    @Test
    fun `assertNotNull with message`() {
        assertNotNull(nothing, "no value")
    }

    @Test
    fun `assertContains without message`() = assertContains(listOf(1, 2), 3)

    @Test
    fun `fail with message`() {
        fail("not written yet")
    }
}
