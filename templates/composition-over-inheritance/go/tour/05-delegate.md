+++
id = "delegate"
title = "Asking the parts"
file = "internal/catalog/product.go"
region = "delegate"
also = ["internal/catalog/catalog.go", "internal/catalog/product_test.go"]
+++

`Product` does not compute its price itself. `Price()` hands the base price to its `Pricing` function and returns the
answer. `ShippingMethod()` and `Packaging()` read the other parts. Passing the work to another value like this is
called *delegation*.

From the outside, nothing changed: `main` still calls `Price()`, `ShippingMethod()` and `Packaging()`. The `Product`
interface of the base is gone, because there is only one product type left to describe.

Now open `catalog.go`. Each product picks its three parts, and every combination is one line away. The test in
`product_test.go` builds a discounted e-book, a product that would have needed a new type in the base.

Adding an idea now means adding a part: a new pricing, a new packaging. The number of types stays the same.
