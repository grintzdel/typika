+++
id = "the-problem"
title = "One method, every rule"
+++

Before the pattern, `ShippingQuote` priced every option itself:

```ts
const freeShipping = this.option === 'standard' || isMember
if (freeShipping && isAtLeast(subtotal, FREE_SHIPPING_THRESHOLD)) return ZERO

const isHeavy = weightOf(order) > HEAVY_PARCEL_GRAMS
if (this.option === 'express') {
  return isHeavy ? money(1890) : money(1290)
} else {
  return isHeavy ? money(690) : money(490)
}
```

This code is short and it works. The problem is in its shape. The free-shipping line mixes the rules of both options
into one condition, and the `else` branch silently means "standard". To add a third option, you have to read and edit
the rules of the two others, and a mistake there changes prices that had nothing to do with your change.

Open **Diff from base** to see the full before and after.
