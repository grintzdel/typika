+++
id = "delegate"
title = "Asking the parts"
file = "src/catalog/product.ts"
region = "delegate"
also = ["src/catalog/catalog.ts", "tests/product.test.ts"]
+++

`Product` does not compute its price itself. `price()` hands the base price to its pricing part and returns the
answer. `shippingMethod()` and `packaging()` do the same with the other parts. Passing the work to another object
like this is called *delegation*.

From the outside, nothing changed: the rest of the shop still calls `price()`, `shippingMethod()` and `packaging()`.

Now open `catalog.ts`. Each product picks its three parts, and every combination is one line away. The test in
`tests/product.test.ts` builds a discounted e-book, a product that would have needed a new class in the base.

Adding an idea now means adding a part: a new pricing, a new packaging. The number of classes stays the same.
