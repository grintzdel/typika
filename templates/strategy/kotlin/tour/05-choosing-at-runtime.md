+++
id = "choosing-at-runtime"
title = "Choosing a strategy"
file = "src/main/kotlin/checkout/Checkout.kt"
region = "choice"
also = ["src/main/kotlin/checkout/ShippingOption.kt"]
+++

Someone still has to turn the customer's choice into a strategy. Here, `shippingCostOf` maps each `ShippingOption` to
its strategy with a `when`, and `quoteShipping` hands the matching one to `ShippingQuote`.

The decision has moved, not disappeared. In the base it was an `if` inside the pricing code; now it is a lookup at the
edge of the checkout, kept apart from any pricing rule.

This `when` has no `else` branch, and it does not need one. `ShippingOption` is an `enum class`, so the compiler knows
every value and checks that the `when` covers them all. Add `PICKUP_POINT` to the enum and `Checkout.kt` stops
compiling until you choose a strategy for it. In the base, the new option fell into the `else` branch and was silently
priced as standard.

Try it: the `add-pickup-point-option` exercise asks you to add that option, starting from the base.
