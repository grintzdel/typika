+++
id = "delegate"
title = "Asking the parts, with by"
file = "src/main/kotlin/catalog/Product.kt"
region = "delegate"
also = ["src/main/kotlin/catalog/Catalog.kt", "src/test/kotlin/catalog/ProductTest.kt"]
+++

`Product` does not compute anything itself. Passing the work to another object like this is called *delegation*, and
Kotlin writes most of it for you.

`Shipping by shipping` says: `Product` implements `Shipping`, and every member of `Shipping` is forwarded to the
`shipping` part. The compiler generates the `shippingMethod` property; `Packaging by packaging` does the same for
`packaging`. From the outside, nothing changed: `main` still reads `shippingMethod` and `packaging`.

`price()` is written by hand, because the pricing needs the base price that only the product knows.

Now open `Catalog.kt`. Each product picks its three parts by name, and every combination is one line away. The test
in `ProductTest.kt` builds a discounted e-book, a product that would have needed a new class in the base.

Adding an idea now means adding a part. The number of classes that describe a product stays the same.
