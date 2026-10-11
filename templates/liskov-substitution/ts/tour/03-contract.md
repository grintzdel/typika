+++
id = "contract"
title = "Promise only what you keep"
file = "src/catalog/product.ts"
region = "contract"
also = ["src/checkout/checkout.ts"]
+++

`Product` holds what every product really shares: a SKU, a name and a price. Shipping and downloading become two
separate *capabilities*, `Shippable` and `Downloadable`. A class claims a capability only if it keeps all of its
promises. `DigitalProduct` no longer has a `ship` method that throws: it has no `ship` method at all.

Now open `checkout.ts`. It still decides what to do with each product, but it asks about capabilities, not classes.
`isShippable` checks for a promise the product chose to make. The old `instanceof DigitalProduct` checked for an
exception to a promise the product had inherited.

That difference shows with a new kind of product. A gift card that is neither shipped nor downloaded is a `Product`
and nothing more, and `checkout` handles it without a single change.
