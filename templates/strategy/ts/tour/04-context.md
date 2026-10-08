+++
id = "context"
title = "The context delegates"
file = "src/checkout/shipping-quote.ts"
region = "context"
also = ["tests/shipping-quote.test.ts"]
+++

`ShippingQuote` is the *context*: the code that needs a shipping price. It still computes the subtotal and the total,
because those do not change from one option to another. For the part that varies, it asks the `ShippingCost` it was
given.

Notice what `ShippingQuote` no longer knows: there is no `option` field and no `if`. It cannot tell standard from express,
and that is the point. Adding an option will not touch this file.

This also changes how you test it. `tests/shipping-quote.test.ts` passes a flat-rate `ShippingCost` written inline in the
test, and checks the totals without involving any real pricing rule. In the base, testing the totals meant knowing the
price of a real option.
