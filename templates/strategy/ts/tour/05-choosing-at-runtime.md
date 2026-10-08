+++
id = "choosing-at-runtime"
title = "Choosing a strategy"
file = "src/checkout/checkout.ts"
region = "choice"
also = ["src/checkout/shipping-option.ts"]
+++

Someone still has to turn the customer's choice into a strategy. Here, `shippingCosts` maps each `ShippingOption` to its
strategy, and `quoteShipping` hands the matching one to `ShippingQuote`.

The decision has moved, not disappeared. In the base it was an `if` inside the pricing code; now it is a lookup at the
edge of the checkout, kept apart from any pricing rule.

The `Record<ShippingOption, ShippingCost>` type does real work. Add `'pickup-point'` to `SHIPPING_OPTIONS` and the
compiler reports this object as incomplete until you register a strategy for it. In the base, a new option fell into
the `else` branch and was silently priced as standard.

Try it: the `add-pickup-point-option` exercise asks you to add that option, starting from the base.
