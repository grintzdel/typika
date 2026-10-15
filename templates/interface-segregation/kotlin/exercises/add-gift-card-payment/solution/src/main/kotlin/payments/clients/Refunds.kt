package payments.clients

import payments.Payment
import payments.PaymentMethod
import payments.Refundable

class Refunds(private val methods: Map<PaymentMethod, Refundable>) {
    fun refund(payment: Payment) {
        val method = methods[payment.method]
            ?: throw UnsupportedOperationException("Payments by ${payment.method} cannot be refunded")
        method.refund(payment)
    }
}
