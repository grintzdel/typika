+++
id = "hierarchy"
title = "A family tree of open classes"
+++

Before this template, each kind of product was a subclass of the one before:

```kotlin
open class Product(…)                                        // e-book: no shipping
open class PhysicalProduct(…) : Product(…)                   // parcel, cardboard box
open class PerishableProduct(…) : PhysicalProduct(…)         // refrigerated, insulated box
class DiscountedPerishableProduct(…) : PerishableProduct(…)
```

Every class and every member that a subclass changes had to be marked `open`, and every change is marked `override`.
`DiscountedPerishableProduct` overrides `price()` and calls `super.price()` to get the full price first.

Kotlin chose `final` by default on purpose: a class that can be extended makes a promise to every subclass, and
`open` makes you sign it. The tree still reads well. The trouble starts when two ideas do not fit in one line of
parents: "discounted" has nothing to do with "perishable", yet here a discount only exists for perishable products.

Open **Diff from base** to see the full before and after.
