package payments.clients

import payments.Payment
import payments.PaymentGateway
import payments.PaymentMethod

class Refunds(private val gateways: Map<PaymentMethod, PaymentGateway>) {
    fun refund(payment: Payment) {
        gateways.getValue(payment.method).refund(payment)
    }
}
