# Switch to another payment provider

The shop is moving from LegacyPay to SwiftPay. Its SDK is in `src/main/kotlin/vendor/swiftpay/SwiftPayClient.kt`, and
like LegacyPay's, the shop cannot change it. Its contract is different: amounts are decimal strings (`"32.50"`), card
tokens are called sources, a charge returns its id, and failures are thrown as a `SwiftPayException` with an error
code.

`openCheckoutWithSwiftPay(client)`, next to `openCheckout`, must return a checkout and a cancellation that behave
exactly like today's, on SwiftPay: same outcomes, same messages for the customer. LegacyPay must keep working until
the move is over.

You start from the code **before** the Adapter pattern. So that the tests compile, a teammate declared
`openCheckoutWithSwiftPay` in `src/main/kotlin/checkout/SwiftPayCheckout.kt`, but it still opens a LegacyPay
checkout. Start there and with `Checkout.kt` and `Cancellation.kt` next to it, and read the new tests in
`src/test/kotlin/checkout/SwiftPayTest.kt`.

Done when all tests pass.

Once it works, look at `Checkout` and `Cancellation`. How much of their code is about the shop, and how much about a
payment provider?
