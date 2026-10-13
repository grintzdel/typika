+++
id = "closed-switch"
title = "The same when, twice"
+++

Before this template, `totalOf` decided the discounts with a `when` on the customer tier and an `if` for bulk orders:

```kotlin
when (order.customer.tier) {
    Tier.MEMBER -> total -= subtotal.percent(MEMBER_DISCOUNT_PERCENT)
    Tier.REGULAR -> {}
}
if (subtotal.isAtLeast(BULK_DISCOUNT_FROM)) {
    total -= BULK_DISCOUNT
}
```

`receiptFor` needed the same decisions to print the discount lines, so it had its own copy of that `when` and `if`.

Kotlin checks that a `when` on an enum covers every tier, but that is not the axis that grows: a new discount is not a
new tier. Each one means editing both functions, in the same way, without forgetting one. Miss the receipt and the
customer pays a price they cannot see. Miss the total and the receipt lies.

Open **Diff from base** to see the full before and after.
