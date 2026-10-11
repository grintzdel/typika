+++
id = "target-interface"
title = "The interface the shop wants"
file = "src/payments/payment-gateway.ts"
region = "target"
also = ["src/checkout/checkout.ts"]
+++

`PaymentGateway` is the *target*: the interface the shop would have written if no SDK existed. It takes `Money` and
a `Card`, the shop's own types, and returns a `ChargeResult` that says what happened in the shop's words:
`approved`, `declined` with a reason, or `unavailable`.

Nothing in it mentions LegacyPay. No cents, no `978`, no numeric codes.

Now open `checkout.ts`. `Checkout` receives a `PaymentGateway` and reads a `ChargeResult`, with a `switch` that the
compiler checks: every status is handled, and a new one would be reported. The customer messages are still here,
because they belong to the shop, not to a provider.

The interface is designed from the needs of its users, not from the SDK. That is what lets a second provider fit in.
