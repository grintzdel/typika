+++
id = "hierarchy"
title = "A family tree of products"
+++

Before this template, each kind of product was a subclass of the one before:

```js
class Product { … }                                          // e-book: no shipping
class PhysicalProduct extends Product { … }                  // parcel, cardboard box
class PerishableProduct extends PhysicalProduct { … }        // refrigerated, insulated box
class DiscountedPerishableProduct extends PerishableProduct { … }
```

Each subclass *overrides* the methods it changes. `PerishableProduct` replaces `shippingMethod` and `packaging`.
`DiscountedPerishableProduct` replaces `price` and calls `super.price()` to get the full price first.

In JavaScript, `class` and `extends` are a nicer way to write something older: the *prototype chain*. A yogurt object
does not hold a `price` method. When you call `yogurt.price()`, JavaScript looks for `price` on the yogurt, then on
`DiscountedPerishableProduct.prototype`, then on `PerishableProduct.prototype`, and so on up the chain until it finds
it. `super.price()` starts the same search one link higher.

This reads well, and the chain shares code for free: a perishable product gets everything a physical product does.
The trouble starts when two ideas do not fit in one chain. "Discounted" has nothing to do with "perishable", yet here
a discount only exists for perishable products.

Open **Diff from base** to see the full before and after.
