+++
id = "explosion"
title = "One new idea, twice the classes"
+++

Imagine the shop now sells a discounted mug. There is no class for it: `DiscountedPerishableProduct` is perishable, and
`PhysicalProduct` has no discount. You need a `DiscountedPhysicalProduct`, which copies the discount code, and
`DiscountedPerishableProduct` now has to be `open` too if anything is to extend it.

Now add gift wrap. Every kind of physical product can be gift-wrapped, so every class needs a gift-wrapped twin:

```
PhysicalProduct            GiftWrappedPhysicalProduct
DiscountedPhysicalProduct  GiftWrappedDiscountedPhysicalProduct
PerishableProduct          GiftWrappedPerishableProduct
…                          …
```

Each new idea multiplies the number of classes, and the same code gets copied into several of them. That is the
explosion: a class tree can only grow in one direction at a time, but products vary in several.

Try it: the `add-gift-wrap` exercise asks you to add gift wrap, starting from the base.
