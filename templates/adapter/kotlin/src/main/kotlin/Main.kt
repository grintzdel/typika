import checkout.PaymentOutcome
import checkout.openCheckout
import shop.Card
import shop.Customer
import shop.Order
import shop.OrderLine
import shop.Tier
import shop.eur
import vendor.legacypay.LegacyPayClient

private val order = Order(
    Customer("Ada", Tier.REGULAR),
    listOf(OrderLine("MUG-01", eur(1200), quantity = 2), OrderLine("TEA-GREEN", eur(850), quantity = 1)),
)

fun main() {
    val (checkout, cancellation) = openCheckout(LegacyPayClient())

    println("Ada checks out ${order.total}")
    for (token in listOf("tok_no_funds", "tok_expired", "tok_issuer_down", "tok_visa")) {
        val outcome = checkout.pay(order, Card(token))
        val detail = when (outcome) {
            is PaymentOutcome.Paid -> "paid ${outcome.paymentId}"
            is PaymentOutcome.Declined -> "declined ${outcome.message}"
            PaymentOutcome.RetryLater -> "retry later"
        }
        println("  ${token.padEnd(16)} $detail")

        if (outcome is PaymentOutcome.Paid) {
            println("Ada cancels the order")
            println("  refund ${outcome.paymentId}  ${cancellation.cancel(outcome.paymentId, outcome.amount)}")
        }
    }
}
