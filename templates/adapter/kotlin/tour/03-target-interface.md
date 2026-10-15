+++
id = "target-interface"
title = "The interface the shop wants"
file = "src/main/kotlin/payments/PaymentGateway.kt"
region = "target"
also = ["src/main/kotlin/checkout/Checkout.kt"]
+++

`PaymentGateway` is the *target*: the interface the shop would have written if no SDK existed. It takes `Money` and
a `Card`, the shop's own types, and returns a `ChargeResult` that says what happened in the shop's words: `Approved`,
`Declined` with a reason, or `Unavailable`.

Nothing in it mentions LegacyPay. No cents, no `978`, no numeric codes.

`ChargeResult` is a `sealed interface`. Open `Checkout.kt`: its `when` on the result has no `else`, because the
compiler knows every case. Add a fourth one and `Checkout` stops compiling until it handles it. The customer messages
are still here, because they belong to the shop, not to a provider.

The interface is designed from the needs of its users, not from the SDK. That is what lets a second provider fit in.
