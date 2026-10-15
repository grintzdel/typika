package payments.gateways

import payments.CardToken
import payments.Payment
import payments.PaymentGateway
import payments.PaymentMethod
import shop.Ledger
import shop.Money

class BankTransferGateway(private val ledger: Ledger) : PaymentGateway {
    private var payments = 0

    override fun charge(amount: Money): Payment {
        payments += 1
        ledger.record("bank transfer: requested $amount")
        return Payment("transfer-$payments", PaymentMethod.BANK_TRANSFER, amount)
    }

    override fun refund(payment: Payment) {
        ledger.record("bank transfer: sent back ${payment.amount} of ${payment.id}")
    }

    override fun saveCard(customerEmail: String, cardNumber: String): CardToken =
        throw UnsupportedOperationException("Bank transfers do not store cards")

    override fun subscribe(card: CardToken, monthlyFee: Money) =
        throw UnsupportedOperationException("Bank transfers do not support subscriptions")
}
