package checkout

import vendor.legacypay.LegacyPayClient
import vendor.swiftpay.SwiftPayClient

fun openCheckoutWithSwiftPay(client: SwiftPayClient) = openCheckout(LegacyPayClient())
