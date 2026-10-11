# Switch to another payment provider

The shop is moving from LegacyPay to SwiftPay. Its SDK is in `src/vendor/swift-pay/swift-pay-client.ts`, and like
LegacyPay's, the shop cannot change it. Its contract is different: amounts are decimal strings (`"32.50"`), card
tokens are called sources, and results are objects with an `ok` flag and an error name.

`openCheckoutWithSwiftPay(client)`, next to `openCheckout`, must return a checkout and a cancellation that behave
exactly like today's, on SwiftPay: same outcomes, same messages for the customer. LegacyPay must keep working until
the move is over.

You start from the code **before** the Adapter pattern. Start with `src/checkout/open-checkout.ts`,
`src/checkout/checkout.ts` and `src/checkout/cancellation.ts`, and read the new tests in `tests/swift-pay.test.ts`.

Done when all tests pass.

Once it works, look at `Checkout` and `Cancellation`. How much of their code is about the shop, and how much about a
payment provider?
