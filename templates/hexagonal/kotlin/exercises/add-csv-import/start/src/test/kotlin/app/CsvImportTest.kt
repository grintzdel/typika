package app

import kotlin.test.Test
import kotlin.test.assertEquals

private const val HEADER = "email,name,sku,unitPriceCents,quantity"

private fun csvOf(vararg rows: String) = (listOf(HEADER) + rows).joinToString("\n")

class CsvImportTest {
    @Test
    fun `places one order per row`() {
        val shop = openShop()

        val report = shop.csvImport.importOrders(
            csvOf("ada@example.com,Ada,MUG-01,1200,2", "grace@example.com,Grace,KETTLE-01,5990,1")
        )

        assertEquals(listOf("order-1", "order-2"), report.imported)
        assertEquals(emptyList(), report.rejectedLines)
        assertEquals(
            mapOf(
                "orderId" to "order-2",
                "status" to "pending",
                "customerEmail" to "grace@example.com",
                "totalCents" to 5990,
            ),
            shop.get("/orders/order-2").body,
        )
    }

    @Test
    fun `confirms and announces imported orders like any other order`() {
        val shop = openShop()

        shop.csvImport.importOrders(csvOf("ada@example.com,Ada,MUG-01,1200,2"))

        assertEquals(
            listOf("Order order-1 confirmed" to "Hello Ada, we received your order of 24.00 EUR."),
            shop.mailer.sent.map { it.subject to it.body },
        )
        assertEquals(listOf("OrderPlaced"), shop.broker.published.map { it.topic })
    }

    @Test
    fun `rejects the rows the shop would refuse and imports the others`() {
        val shop = openShop()

        val report = shop.csvImport.importOrders(
            csvOf(
                "ada@example.com,Ada,MUG-01,1200,2",
                "grace@example.com,Grace,KETTLE-01,5990,0",
                "grace,Grace,KETTLE-01,5990,1",
                "grace@example.com,Grace,TEA-GREEN,850,3",
            )
        )

        assertEquals(listOf("order-1", "order-2"), report.imported)
        assertEquals(listOf(3, 4), report.rejectedLines)
        assertEquals(2, shop.mailer.sent.size)
    }
}
