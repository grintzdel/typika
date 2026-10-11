+++
id = "switch-on-type"
title = "A switch in the middle of the steps"
+++

Before the pattern, `ShippingDesk.ship` chose the parcel itself:

```ts
let parcel: Parcel
switch (carrier) {
  case 'standard':
    parcel = new StandardParcel()
    break
  case 'express':
    if (weightOf(order) > EXPRESS_MAX_GRAMS) throw new Error('Too heavy for express shipping')
    parcel = new ExpressParcel()
    break
}
```

The steps around it are the same for every carrier, but they share a method with one `case` per carrier. To add a
carrier, you open the code that ships every order, and add your rules next to the rules of the others. The express
weight limit already sits there, in the middle of the shipping steps.

Open **Diff from base** to see the full before and after.
