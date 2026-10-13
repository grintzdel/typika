package orders

import services.Notifier
import services.PdfDocument
import services.PdfWriter

data class Email(val recipient: String, val message: String)

class FakeNotifier : Notifier {
    val sent = mutableListOf<Email>()

    override fun notify(recipient: String, message: String) {
        sent += Email(recipient, message)
    }
}

class FakePdfWriter : PdfWriter {
    val written = mutableListOf<PdfDocument>()

    override fun write(document: PdfDocument): ByteArray {
        written += document
        return byteArrayOf(37, 80, 68, 70)
    }
}

class FakeServices {
    val orders = InMemoryOrderRepository()
    val notifier = FakeNotifier()
    val pdf = FakePdfWriter()

    fun orderService() = OrderService(orders, notifier, pdf)
}
