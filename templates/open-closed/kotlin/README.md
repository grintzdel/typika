# Open/closed: discount rules

The shop gives members 10% off and everyone 5.00 EUR off from 100.00 EUR. This template shows the open/closed
principle: each discount is a `DiscountRule`, and the code that charges the customer and prints the receipt goes through
the list of rules without knowing any of them. `DiscountRule` is a `fun interface`, so each rule is a lambda.

Compare it with its base, `open-closed-base-kotlin`, where each discount is a branch written twice.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # prints the receipts of two sample orders
gradle test
```

## What to look at

- `src/main/kotlin/pricing/DiscountRule.kt`: the extension point, one method.
- `src/main/kotlin/pricing/rules/`: one file per discount.
- `src/main/kotlin/pricing/DiscountRules.kt`: the list of rules in use.
- `src/main/kotlin/pricing/PriceOrder.kt` and `src/main/kotlin/receipts/Receipt.kt`: they read the list and never
  change when a rule is added.

## Variants

- TypeScript: `open-closed-ts`, with a class per rule.
