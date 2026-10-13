+++
id = "broken-promise"
title = "An e-book that cannot ship"
+++

Before this template, every product extended `PhysicalProduct`, and the e-book overrode what it could not do:

```kotlin
open class PhysicalProduct(…, val weightInGrams: Int) {
    open fun ship(address: String) = Parcel(sku, address, weightInGrams)
}

class DigitalProduct(…) : PhysicalProduct(sku, name, price, weightInGrams = 0) {
    override fun ship(address: String): Parcel =
        throw UnsupportedOperationException("$sku is digital and cannot be shipped")
}
```

Kotlin made the base write `open` twice, on the class and on `ship`, before anyone could do this. `open` lets a subclass
change `ship`; it does not make the subclass keep the promise `ship` makes to its callers. The compiler is happy: a
`DigitalProduct` *is* a `PhysicalProduct`. But `checkout`, written for physical products, crashes when it ships one. So
`checkout` learned to recognise it:

```kotlin
if (product is DigitalProduct) { …; continue }
```

That `is` check is the symptom. Code that receives a parent type has to know the children to stay correct. Each new
product that does not fit, like a gift card, adds a branch. The weight of 0 g is a quieter lie: any code that sums
weights still counts the e-book.

Open **Diff from base** to see the full before and after.
