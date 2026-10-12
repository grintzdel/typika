+++
id = "explosion"
title = "One new idea, twice the types"
+++

Imagine the shop now sells a discounted mug. There is no type for it: `DiscountedPerishableProduct` is perishable, and
`PhysicalProduct` has no discount. You need a `DiscountedPhysicalProduct`, which copies the discount code.

Now add gift wrap. Every kind of physical product can be gift-wrapped, so every type needs a gift-wrapped twin:

```
PhysicalProduct            GiftWrappedPhysicalProduct
DiscountedPhysicalProduct  GiftWrappedDiscountedPhysicalProduct
PerishableProduct          GiftWrappedPerishableProduct
…                          …
```

Each new idea multiplies the number of types, and the same code gets copied into several of them. Embedding does not
change that: a chain of embedded structs can only grow in one direction at a time, but products vary in several.

Try it: the `add-gift-wrap` exercise asks you to add gift wrap, starting from the base.
