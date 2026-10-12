+++
id = "error-mapping"
title = "Translating failures"
file = "internal/payments/legacypay_adapter.go"
region = "error-mapping"
also = ["internal/payments/legacypay_adapter_test.go"]
+++

Translating calls is the easy half. The other half is translating what comes back, and failures above all.
`chargeResultOf` turns each LegacyPay code into a `ChargeResult`.

Look at `default`. The SDK has codes the shop does not handle one by one, and it may add more. Every unknown code
becomes a refusal, because the safe mistake for a payment is to decline, never to approve.

The adapter also decides what the shop may know. `CodeInsufficientFunds` and `CodeExpiredCard` get their own reasons,
because the customer can act on them; fraud stays a plain `Refused`. `legacypay_adapter_test.go` checks the mapping
without going through the checkout.

Try it: the `map-declined-code` exercise gives you an adapter whose `default` approves.
