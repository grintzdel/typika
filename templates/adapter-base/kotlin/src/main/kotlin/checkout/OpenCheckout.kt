package checkout

import vendor.legacypay.LegacyPayClient

data class CheckoutDesk(val checkout: Checkout, val cancellation: Cancellation)

fun openCheckout(client: LegacyPayClient) = CheckoutDesk(Checkout(client), Cancellation(client))
