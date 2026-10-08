+++
id = "the-problem"
title = "One function, every rule"
+++

Before the pattern, one function priced every option:

```kotlin
val freeShipping = option == ShippingOption.STANDARD || isMember
if (freeShipping && subtotal.isAtLeast(FREE_SHIPPING_THRESHOLD)) return Money.ZERO

val isHeavy = order.weightGrams > HEAVY_PARCEL_GRAMS
return if (option == ShippingOption.EXPRESS) {
    if (isHeavy) eur(1890) else eur(1290)
} else {
    if (isHeavy) eur(690) else eur(490)
}
```

This code is short and it works. The problem is in its shape. The free-shipping line mixes the rules of both options
into one condition, and the `else` branch silently means "standard". To add a third option, you have to read and edit
the rules of the two others, and a mistake there changes prices that had nothing to do with your change.

Open **Diff from base** to see the full before and after.
