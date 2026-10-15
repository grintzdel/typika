package payments.clients

import payments.Payment
import payments.PaymentMethod
import payments.Refundable

class Refunds(private val methods: Map<PaymentMethod, Refundable>) {
    fun refund(payment: Payment) {
        methods.getValue(payment.method).refund(payment)
    }
}
