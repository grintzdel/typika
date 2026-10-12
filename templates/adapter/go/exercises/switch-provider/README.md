# Switch to another payment provider

The shop is moving from LegacyPay to SwiftPay. Its SDK is in `internal/swiftpay/client.go`, and like LegacyPay's,
the shop cannot change it. Its contract is different: amounts are decimal strings (`"32.50"`), card tokens are called
sources, and failures are `*swiftpay.Error` values with a code.

`OpenCheckoutWithSwiftPay(client)`, next to `OpenCheckout`, must return a checkout and a cancellation that behave
exactly like today's, on SwiftPay: same outcomes, same messages for the customer. LegacyPay must keep working until
the move is over.

You start from the code **before** the Adapter pattern. So that the tests compile, a teammate declared
`OpenCheckoutWithSwiftPay` in `internal/checkout/swiftpay_checkout.go`, but it still opens a LegacyPay checkout. Start
there and with `internal/checkout/checkout.go` and `cancellation.go`, and read the new tests in
`internal/checkout/swiftpay_test.go`.

Done when all tests pass.

Once it works, look at `Checkout` and `Cancellation`. How much of their code is about the shop, and how much about a
payment provider?
