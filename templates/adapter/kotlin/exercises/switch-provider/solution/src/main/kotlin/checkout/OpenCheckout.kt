package checkout

import payments.LegacyPayAdapter
import payments.PaymentGateway
import payments.SwiftPayAdapter
import vendor.legacypay.LegacyPayClient
import vendor.swiftpay.SwiftPayClient

data class CheckoutDesk(val checkout: Checkout, val cancellation: Cancellation)

private fun deskFor(payments: PaymentGateway) = CheckoutDesk(Checkout(payments), Cancellation(payments))

fun openCheckout(client: LegacyPayClient) = deskFor(LegacyPayAdapter(client))

fun openCheckoutWithSwiftPay(client: SwiftPayClient) = deskFor(SwiftPayAdapter(client))
