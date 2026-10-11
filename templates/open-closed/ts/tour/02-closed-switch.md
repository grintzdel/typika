+++
id = "closed-switch"
title = "The same switch, twice"
+++

Before this template, `totalOf` decided the discounts with a `switch` on the customer tier and an `if` for bulk orders:

```ts
switch (order.customer.tier) {
  case 'member':
    total = subtractMoney(total, percentOf(subtotal, MEMBER_DISCOUNT_PERCENT))
    break
  case 'regular':
    break
}
if (subtotal.cents >= BULK_DISCOUNT_FROM.cents) {
  total = subtractMoney(total, BULK_DISCOUNT)
}
```

`receiptFor` needed the same decisions to print the discount lines, so it had its own copy of that `switch` and `if`.

Each new discount means editing both functions, in the same way, without forgetting one. Miss the receipt and the
customer pays a price they cannot see. Miss the total and the receipt lies. The functions are never done: they change
with every marketing campaign.

Open **Diff from base** to see the full before and after.
