+++
id = "context"
title = "The context delegates"
file = "src/main/kotlin/checkout/ShippingQuote.kt"
region = "context"
also = ["src/test/kotlin/checkout/ShippingQuoteTest.kt"]
+++

`ShippingQuote` is the *context*: the code that needs a shipping price. It still computes the subtotal and the total,
because those do not change from one option to another. For the part that varies, it calls the `ShippingCost` it
received in its constructor.

Notice what `ShippingQuote` does not know: there is no `option` property and no `when`. It cannot tell standard from
express, and that is the point. Adding an option will not touch this class.

This also changes how you test it. `ShippingQuoteTest` passes a flat-rate lambda, `ShippingCost { eur(100) }`, and
checks the totals without involving any real pricing rule. In the base, testing the totals meant knowing the price of a
real option.
