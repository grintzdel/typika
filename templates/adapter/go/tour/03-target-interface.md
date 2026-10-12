+++
id = "target-interface"
title = "The interface the shop wants"
file = "internal/payments/gateway.go"
region = "target"
also = ["internal/checkout/checkout.go"]
+++

`payments.Gateway` is the *target*: the interface the shop would have written if no SDK existed. It takes
`shop.Money` and a `shop.Card`, the shop's own types, and returns a `ChargeResult` that says what happened in the
shop's words: `Approved`, `Declined` with a reason, or `Unavailable`. A refused refund is an ordinary Go `error`,
`ErrRefundRejected`.

Nothing in it mentions LegacyPay. No cents, no `978`, no numeric codes.

Now open `checkout.go`. `Checkout` holds a `payments.Gateway` and reads a `ChargeResult`. Go does not check that a
`switch` covers every status, so the `default` branch is a decision: anything that is neither approved nor declined
asks the customer to retry later. The customer messages stay here, because they belong to the shop, not to a
provider.
