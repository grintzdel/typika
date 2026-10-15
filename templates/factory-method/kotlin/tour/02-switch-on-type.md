+++
id = "switch-on-type"
title = "A when in the middle of the steps"
+++

Before the pattern, `ShippingDesk.ship` chose the parcel itself:

```kotlin
val parcel = when (carrier) {
    CarrierName.STANDARD -> StandardParcel
    CarrierName.EXPRESS -> {
        require(order.weightGrams <= EXPRESS_MAX_GRAMS) { "Too heavy for express shipping" }
        ExpressParcel
    }
}
```

Kotlin helps a little here: the `when` covers every `CarrierName`, so a new carrier is a compile error until it has a
branch. But the branch still goes into the code that ships every order, next to the rules of the other carriers. The
express weight limit already sits there, in the middle of the shipping steps.

Open **Diff from base** to see the full before and after.
