+++
id = "compose"
title = "A product made of parts"
file = "src/main/kotlin/catalog/Product.kt"
region = "compose"
also = [
  "src/main/kotlin/catalog/Pricing.kt",
  "src/main/kotlin/catalog/Shipping.kt",
  "src/main/kotlin/catalog/Packaging.kt",
]
+++

There is now one `Product` class, final like any Kotlin class, and no subclasses. What makes products different is
passed to its constructor: three parts.

- `pricing` turns the base price into the price the customer pays: `FullPrice`, or `discounted(30)`.
- `shipping` says how the product travels: `NoShipping`, `Parcel` or `Refrigerated`.
- `packaging` lists what it is packed in: `NoPackaging`, `CardboardBox` or `InsulatedBox`.

`Pricing` is a `fun interface`, so a lambda is a complete pricing. The shipping and packaging choices are `object`s:
they hold no state, so one instance of each is enough. The parts do not know about each other, so any pricing works
with any shipping. A discounted mug is a `Parcel` with `discounted(20)`: no new class needed.

This is the idea behind the slogan "favour composition over inheritance": a product *has* a pricing, instead of
*being* a kind of priced product.
