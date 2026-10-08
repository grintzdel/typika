`StandardShipping` has the same shape as the strategy you need: one free-shipping check, then a price that depends on
`order.WeightGrams()` compared with `heavyParcelGrams`. The difference is who gets free shipping: express is free only
when the customer is a member **and** the subtotal reaches `freeShippingThreshold`.
