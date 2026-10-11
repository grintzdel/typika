+++
id = "broken-promise"
title = "An e-book that cannot ship"
+++

Before this template, every product extended `PhysicalProduct`, and the e-book overrode what it could not do:

```ts
class DigitalProduct extends PhysicalProduct {
  constructor(…) { super(sku, name, price, 0) }
  override ship(_address: string): Parcel {
    throw new Error(`${this.sku} is digital and cannot be shipped`)
  }
}
```

The type checker is happy: a `DigitalProduct` *is* a `PhysicalProduct`. But `checkout`, written for physical
products, crashes when it ships one. So `checkout` learned to recognise it:

```ts
if (product instanceof DigitalProduct) { … continue }
```

That `instanceof` is the symptom. Code that receives a parent type has to know the children to stay correct. Each new
product that does not fit, like a gift card, adds a branch. The weight of 0 g is a quieter lie: any code that sums
weights still counts the e-book.

Open **Diff from base** to see the full before and after.
