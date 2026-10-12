+++
id = "compose"
title = "A product made of parts"
file = "internal/catalog/product.go"
region = "compose"
also = ["internal/catalog/pricing.go", "internal/catalog/shipping.go", "internal/catalog/packaging.go"]
+++

There is now one `Product` struct, and no embedding. What makes products different is passed to `NewProduct`: a
`Policies` value with three parts.

- `Pricing` turns the base price into the price the customer pays: `FullPrice`, or `Discounted(30)`.
- `Shipping` says how the product travels: `NoShipping`, `Parcel` or `Refrigerated`.
- `Packaging` lists what it is packed in: `NoPackaging`, `CardboardBox` or `InsulatedBox`.

Each part is as small as Go allows. `Pricing` is a function type, `Shipping` a plain value, `Packaging` a struct with
one field. They do not know about each other, so any pricing works with any shipping. A discounted mug is a `Parcel`
with `Discounted(20)`: no new type needed.

This is the idea behind the slogan "favour composition over inheritance": a product *has* a pricing, instead of
*being* a kind of priced product.
