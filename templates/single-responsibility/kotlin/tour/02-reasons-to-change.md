+++
id = "reasons-to-change"
title = "Prices and words in one loop"
+++

Before the split, `OrderService.placeOrder` did everything. The heart of it was this loop:

```kotlin
for (line in order.lines) {
    val amount = line.unitPrice * line.quantity
    subtotal += amount
    invoice += "${line.quantity} x ${line.sku}: $amount"
}
```

It is efficient and easy to read. It also mixes two decisions that change for different reasons. The second line is a
pricing rule. The third is invoice wording. The discount and the shipping fee follow the same pattern: each rule adds
its own invoice line right after computing its amount.

The cost shows up when a second reader of the price arrives, such as a PDF invoice or a checkout summary. The prices
are only available as text inside an email, so you either copy the rules or untangle them first.

Open **Diff from base** to see the full before and after.
