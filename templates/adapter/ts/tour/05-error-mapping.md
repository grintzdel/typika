+++
id = "error-mapping"
title = "Translating failures"
file = "src/payments/legacy-pay-adapter.ts"
region = "error-mapping"
also = ["tests/legacy-pay-adapter.test.ts"]
+++

Translating calls is the easy half. The other half is translating what comes back, and failures above all.
`chargeResultOf` turns each LegacyPay code into a `ChargeResult`.

Look at `default`. The SDK has codes the shop does not handle one by one, and it may add more. Every unknown code
becomes a refusal, because the safe mistake for a payment is to decline, never to approve.

The adapter also decides what the shop may know. `INSUFFICIENT_FUNDS` and `EXPIRED_CARD` get their own reasons,
because the customer can act on them; fraud stays a plain refusal. `tests/legacy-pay-adapter.test.ts` checks the
mapping without going through the checkout.

Try it: the `map-declined-code` exercise gives you an adapter whose `default` approves.
