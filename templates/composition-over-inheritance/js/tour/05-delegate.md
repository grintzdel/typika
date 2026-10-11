+++
id = "delegate"
title = "Asking the parts"
file = "src/catalog/product.js"
region = "delegate"
also = ["src/catalog/catalog.js", "tests/product.test.js"]
+++

A product does not compute its price itself. `price()` hands the base price to its pricing part and returns the
answer. `shippingMethod()` and `packaging()` do the same with the other parts. Passing the work to another object
like this is called *delegation*.

There is no prototype chain to search either: the three methods sit on the product object itself. From the outside,
nothing changed: the rest of the shop still calls `price()`, `shippingMethod()` and `packaging()`.

Now open `catalog.js`. Each product picks its three parts by name, and every combination is one object away. The test
in `tests/product.test.js` builds a discounted e-book, a product that would have needed a new class in the base.

Adding an idea now means adding a part: a new pricing, a new packaging. The number of classes stays at zero.
