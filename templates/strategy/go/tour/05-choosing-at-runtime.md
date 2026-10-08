+++
id = "choosing-at-runtime"
title = "Choosing a strategy"
file = "internal/checkout/checkout.go"
region = "choice"
also = ["internal/checkout/shipping_option.go", "internal/checkout/shipping_options_test.go"]
+++

Someone still has to turn the customer's choice into a strategy. Here, `shippingCosts` maps each `ShippingOption` to
its function, and `QuoteShipping` hands the matching one to `QuoteWith`.

The decision has moved, not disappeared. In the base it was an `if` inside the pricing code; now it is a lookup at the
edge of the checkout, kept apart from any pricing rule.

Go cannot check that this map is complete. Add `PickupPoint` to `ShippingOptions` and forget the map: the code still
compiles, and `QuoteShipping` returns an "unknown shipping option" error. `shipping_options_test.go` closes that gap by
quoting every option on offer. In the base, a new option silently fell through to the standard prices, and no error
told you.

Try it: the `add-pickup-point-option` exercise asks you to add that option, starting from the base.
