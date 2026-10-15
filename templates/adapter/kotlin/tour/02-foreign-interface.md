+++
id = "foreign-interface"
title = "The SDK, everywhere"
file = "src/main/kotlin/vendor/legacypay/LegacyPayClient.kt"
+++

This is the SDK. `makePayment` takes cents, a numeric currency code and a card token, and returns a `code`. The
meaning of each code lives in `LegacyPayCodes`: `0` approves, everything else is some kind of failure.

Before the pattern, the checkout called it directly:

```kotlin
val response = client.makePayment(amount.cents, EUR_NUMERIC_CODE, card.token)

return when (response.code) {
    LegacyPayCodes.APPROVED -> PaymentOutcome.Paid(response.reference, amount)
    LegacyPayCodes.INSUFFICIENT_FUNDS -> PaymentOutcome.Declined("Your card was declined: insufficient funds.")
    …
```

`Cancellation` did the same with `reversePayment`. Each class knew the units, the codes and the SDK's quirks, and
each would have to be rewritten to change provider.

Open **Diff from base** to see the full before and after.
