package orders

import services.PdfDocument
import services.PdfRow
import shop.Order
import shop.OrderLine
import shop.eur
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class PdfInvoiceTest {
    @Test
    fun `writes the invoice of a placed order as a PDF`() {
        val services = FakeServices()
        val orderService = services.orderService()
        orderService.placeOrder(
            Order(ada, listOf(OrderLine("MUG-01", eur(1200), 2), OrderLine("TEA-GREEN", eur(850), 1))),
        )

        val file = orderService.downloadInvoice("order-1")

        val expected = PdfDocument(
            title = "Invoice order-1",
            rows = listOf(
                PdfRow("2 x MUG-01", "24.00 EUR"),
                PdfRow("1 x TEA-GREEN", "8.50 EUR"),
                PdfRow("Shipping", "4.90 EUR"),
            ),
            total = "37.40 EUR",
        )
        assertEquals(listOf(expected), services.pdf.written)
        assertContentEquals(byteArrayOf(37, 80, 68, 70), file)
    }

    @Test
    fun `shows the member discount and free shipping`() {
        val services = FakeServices()
        val orderService = services.orderService()
        orderService.placeOrder(orderOf(grace, 5990))

        orderService.downloadInvoice("order-1")

        val expected = PdfDocument(
            title = "Invoice order-1",
            rows = listOf(
                PdfRow("1 x TEST-SKU", "59.90 EUR"),
                PdfRow("Member discount", "-5.99 EUR"),
                PdfRow("Shipping", "0.00 EUR"),
            ),
            total = "53.91 EUR",
        )
        assertEquals(listOf(expected), services.pdf.written)
    }

    @Test
    fun `writes the invoice of the requested order`() {
        val services = FakeServices()
        val orderService = services.orderService()
        orderService.placeOrder(orderOf(ada, 1000))
        orderService.placeOrder(orderOf(grace, 2000))

        orderService.downloadInvoice("order-2")

        val written = services.pdf.written.map { it.title to it.total }
        assertEquals(listOf("Invoice order-2" to "22.90 EUR"), written)
    }

    @Test
    fun `refuses an unknown order`() {
        val services = FakeServices()
        val orderService = services.orderService()

        val error = assertFailsWith<IllegalArgumentException> { orderService.downloadInvoice("order-9") }
        assertEquals("Unknown order order-9", error.message)
        assertEquals(emptyList(), services.pdf.written)
    }

    @Test
    fun `keeps emailing the text invoice`() {
        val services = FakeServices()

        services.orderService().placeOrder(orderOf(grace, 5990))

        assertTrue(services.notifier.sent.single().message.endsWith("Total: 53.91 EUR"))
    }
}
