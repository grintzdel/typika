# Single responsibility: placing an order

When a customer places an order, a small shop checks it, works out the price, saves it and emails an invoice. This
template shows the single responsibility principle: each of those jobs changes for its own reason, so each lives in its
own class, and `OrderService` only puts them in order.

Compare it with its base, `single-responsibility-base-ts`, where one method does everything.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places two sample orders and prints their invoices
npm test
```

## What to look at

- `src/orders/order-validator.ts`: what makes an order acceptable.
- `src/pricing/price-calculator.ts`: discounts, shipping and the total, without any text.
- `src/invoices/invoice-formatter.ts`: the wording of the invoice, without any rule.
- `src/orders/order-service.ts`: the orchestrator that calls them in order.
