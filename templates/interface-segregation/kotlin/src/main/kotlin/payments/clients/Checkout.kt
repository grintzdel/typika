package payments.clients

import payments.Chargeable
import payments.Payment
import payments.PaymentMethod
import shop.Money

class Checkout(private val methods: Map<PaymentMethod, Chargeable>) {
    fun pay(method: PaymentMethod, amount: Money): Payment = methods.getValue(method).charge(amount)
}
