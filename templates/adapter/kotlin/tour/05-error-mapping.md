+++
id = "error-mapping"
title = "Translating failures"
file = "src/main/kotlin/payments/LegacyPayAdapter.kt"
region = "error-mapping"
also = ["src/test/kotlin/payments/LegacyPayAdapterTest.kt"]
+++

Translating calls is the easy half. The other half is translating what comes back, and failures above all.
`chargeResultOf` turns each LegacyPay code into a `ChargeResult`.

Look at `else`. This `when` is on an `Int`, so the compiler cannot check that every case is handled and requires an
`else`. It makes you decide what an unknown code means, but not decide well. The SDK has codes the shop does not
handle one by one, and it may add more. Every unknown code becomes a refusal, because the safe mistake for a payment
is to decline, never to approve.

That is the adapter's job at the border: an open set of codes on the SDK's side, a sealed set of results on the
shop's.

The adapter also decides what the shop may know. `INSUFFICIENT_FUNDS` and `EXPIRED_CARD` get their own reasons,
because the customer can act on them; fraud stays a plain refusal. `LegacyPayAdapterTest.kt` checks the mapping
without going through the checkout.

Try it: the `map-declined-code` exercise gives you an adapter whose `else` approves.
