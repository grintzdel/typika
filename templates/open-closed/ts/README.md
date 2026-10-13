# Open/closed: discount rules

The shop gives members 10% off and everyone 5.00 EUR off from 100.00 EUR. This template shows the open/closed
principle: each discount is a `DiscountRule`, and the code that charges the customer and prints the receipt goes through
the list of rules without knowing any of them.

Compare it with its base, `open-closed-base-ts`, where each discount is a branch written twice.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # prints the receipts of two sample orders
npm test
```

## What to look at

- `src/pricing/discount-rule.ts`: the extension point, one method.
- `src/pricing/rules/`: one file per discount.
- `src/pricing/discount-rules.ts`: the list of rules in use.
- `src/pricing/price-order.ts` and `src/receipts/receipt.ts`: they read the list and never change when a rule is added.

## Variants

- Kotlin: `open-closed-kotlin`, where each rule is a lambda behind a `fun interface`.
