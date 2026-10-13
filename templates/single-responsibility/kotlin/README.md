# Single responsibility: placing an order

When a customer places an order, a small shop checks it, works out the price, saves it and emails an invoice. This
template shows the single responsibility principle: each of those jobs changes for its own reason, so each lives in its
own file, and `OrderService` only puts them in order. The jobs that keep no state are top-level functions, not classes.

Compare it with its base, `single-responsibility-base-kotlin`, where one method does everything.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places two sample orders and prints their invoices
gradle test
```

## What to look at

- `src/main/kotlin/orders/OrderValidation.kt`: what makes an order acceptable.
- `src/main/kotlin/pricing/Pricing.kt`: discounts, shipping and the total, without any text.
- `src/main/kotlin/invoices/Invoice.kt`: the wording of the invoice, without any rule.
- `src/main/kotlin/orders/OrderService.kt`: the orchestrator that calls them in order.

## Variants

- TypeScript: `single-responsibility-ts`, with one class per job.
