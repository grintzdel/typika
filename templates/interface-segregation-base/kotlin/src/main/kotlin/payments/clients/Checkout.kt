package payments.clients

import payments.Payment
import payments.PaymentGateway
import payments.PaymentMethod
import shop.Money

class Checkout(private val gateways: Map<PaymentMethod, PaymentGateway>) {
    fun pay(method: PaymentMethod, amount: Money): Payment = gateways.getValue(method).charge(amount)
}
