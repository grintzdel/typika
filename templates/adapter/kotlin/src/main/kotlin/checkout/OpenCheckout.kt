package checkout

import payments.LegacyPayAdapter
import vendor.legacypay.LegacyPayClient

data class CheckoutDesk(val checkout: Checkout, val cancellation: Cancellation)

fun openCheckout(client: LegacyPayClient): CheckoutDesk {
    val payments = LegacyPayAdapter(client)
    return CheckoutDesk(Checkout(payments), Cancellation(payments))
}
