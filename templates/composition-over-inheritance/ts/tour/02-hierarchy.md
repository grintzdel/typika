+++
id = "hierarchy"
title = "A family tree of products"
+++

Before this template, each kind of product was a subclass of the one before:

```ts
class Product { … }                                          // e-book: no shipping
class PhysicalProduct extends Product { … }                  // parcel, cardboard box
class PerishableProduct extends PhysicalProduct { … }        // refrigerated, insulated box
class DiscountedPerishableProduct extends PerishableProduct { … }
```

Each subclass *overrides* the methods it changes. `PerishableProduct` replaces `shippingMethod` and `packaging`.
`DiscountedPerishableProduct` replaces `price` and calls `super.price()` to get the full price first.

This reads well, and inheritance shares code for free: a perishable product gets everything a physical product does.
The trouble starts when two ideas do not fit in one line of parents. "Discounted" has nothing to do with "perishable",
yet here a discount only exists for perishable products.

Open **Diff from base** to see the full before and after.
