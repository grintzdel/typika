+++
id = "compose"
title = "A product made of parts"
file = "src/catalog/product.ts"
region = "compose"
also = ["src/catalog/pricing.ts", "src/catalog/shipping.ts", "src/catalog/packaging.ts"]
+++

There is now one `Product` class, and no subclasses. What makes products different is passed in: a `ProductPolicies`
object with three parts.

- `pricing` turns the base price into the price the customer pays: `fullPrice`, or `discounted(30)`.
- `shipping` says how the product travels: `noShipping`, `parcel` or `refrigerated`.
- `packaging` lists what it is packed in: `noPackaging`, `cardboardBox` or `insulatedBox`.

Each part answers one question, and each lives in its own small file. They do not know about each other, so any
pricing works with any shipping. A discounted mug is a `parcel` with `discounted(20)`: no new class needed.

This is the idea behind the slogan "favour composition over inheritance": a product *has* a pricing policy, instead
of *being* a kind of priced product.
