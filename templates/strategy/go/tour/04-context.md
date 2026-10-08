+++
id = "context"
title = "The context delegates"
file = "internal/checkout/quote.go"
region = "context"
also = ["internal/checkout/quote_with_test.go"]
+++

`QuoteWith` is the *context*: the code that needs a shipping price. It still computes the subtotal and the total,
because those do not change from one option to another. For the part that varies, it calls the `ShippingCost` it was
given.

Notice what `QuoteWith` does not know: there is no `option` parameter and no `if`. It cannot tell standard from express,
and that is the point. Adding an option will not touch this function.

This also changes how you test it. `quote_with_test.go` passes a flat-rate function written inline in the test, and
checks the totals without involving any real pricing rule. In the base, testing the totals meant knowing the price of a
real option.
