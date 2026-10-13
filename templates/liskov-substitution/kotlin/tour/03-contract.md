+++
id = "contract"
title = "Promise only what you keep"
file = "src/main/kotlin/catalog/Product.kt"
region = "contract"
also = ["src/main/kotlin/checkout/Checkout.kt"]
+++

`Product` holds what every product really shares: a SKU, a name and a price. Shipping and downloading become two
separate *capabilities*, `Shippable` and `Downloadable`. A class claims a capability only if it keeps all of its
promises. `DigitalProduct` no longer has a `ship` method that throws: it has no `ship` method at all.

No class is `open` any more. Each product is a final class that implements the interfaces it keeps, so there is no
parent left to break.

Now open `Checkout.kt`. It still decides what to do with each product, but it asks about capabilities, not classes.
`filterIsInstance<Shippable>()` keeps the products that chose to make the promise, typed as `Shippable`. The old
`is DigitalProduct` checked for an exception to a promise the product had inherited.

That difference shows with a new kind of product. A gift card that is neither shipped nor downloaded is a `Product`
and nothing more, and `checkout` handles it without a single change.
