package payments.gateways

import payments.Chargeable
import payments.Payment
import payments.PaymentMethod
import payments.Refundable
import shop.Ledger
import shop.Money

class BankTransferGateway(private val ledger: Ledger) : Chargeable, Refundable {
    private var payments = 0

    override fun charge(amount: Money): Payment {
        payments += 1
        ledger.record("bank transfer: requested $amount")
        return Payment("transfer-$payments", PaymentMethod.BANK_TRANSFER, amount)
    }

    override fun refund(payment: Payment) {
        ledger.record("bank transfer: sent back ${payment.amount} of ${payment.id}")
    }
}
