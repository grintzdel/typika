+++
id = "foreign-interface"
title = "The SDK, everywhere"
file = "src/vendor/legacy-pay/legacy-pay-client.ts"
+++

This is the SDK. `makePayment` takes cents, a numeric currency code and a card token, and returns a `code`. The
meaning of each code lives in `LEGACY_PAY_CODES`: `0` approves, everything else is some kind of failure.

Before the pattern, the checkout called it directly:

```ts
const response = this.client.makePayment(amount.cents, EUR_NUMERIC_CODE, card.token)

switch (response.code) {
  case LEGACY_PAY_CODES.APPROVED:
    return { status: 'paid', paymentId: response.reference, amount }
  case LEGACY_PAY_CODES.INSUFFICIENT_FUNDS:
  …
```

`Cancellation` did the same with `reversePayment`. Each class knew the units, the codes and the SDK's quirks, and
each would have to be rewritten to change provider.

Open **Diff from base** to see the full before and after.
