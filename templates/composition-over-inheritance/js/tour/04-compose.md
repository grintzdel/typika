+++
id = "compose"
title = "A product made of parts"
file = "src/catalog/product.js"
also = ["src/catalog/pricing.js", "src/catalog/shipping.js", "src/catalog/packaging.js"]
+++

There are no product classes anymore. `createProduct` is a *factory function*: you give it a product's details and
its three parts, and it returns a plain object.

- `pricing` turns the base price into the price the customer pays: `fullPrice`, or `discounted(30)`.
- `shipping` says how the product travels: `noShipping`, `parcel` or `refrigerated`.
- `packaging` lists what it is packed in: `noPackaging`, `cardboardBox` or `insulatedBox`.

Each part is a small object in its own file. The parts do not know about each other, so any pricing works with any
shipping. A discounted mug is a `parcel` with `discounted(20)`: no new class needed. `discounted` is a factory
function too: it builds a pricing part for the percentage you ask for.

`basePrice` and the parts are not properties of the returned object. They stay in the function's scope, where the
methods can read them and nothing else can: private without `#`, and without a class.

This is the idea behind the slogan "favour composition over inheritance": a product *has* a pricing part, instead of
*being* a kind of priced product.
