# Dependency inversion: confirming an order

When a customer places an order, the shop saves it and emails a confirmation. This template shows the dependency
inversion principle: `CheckoutService` declares the `Notifier` and `OrderRepository` it needs, receives them through
its constructor, and never names the SMTP mailer or the store that implement them.

Compare it with its base, `dependency-inversion-base-ts`, where `CheckoutService` creates both itself.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places two orders; the SMTP mailer prints what it would send
npm test
```

## What to look at

- `src/checkout/notifier.ts` and `src/checkout/order-repository.ts`: the abstractions, owned by the checkout.
- `src/checkout/checkout-service.ts`: receives its dependencies and names no implementation.
- `src/infrastructure/`: the SMTP mailer and the store implement the checkout's interfaces.
- `src/open-shop.ts`: the composition root, the one place that picks the implementations.

## Variants

- Go: `dependency-inversion-go`, where the checkout declares its interfaces and the mailer fits them implicitly.
- Kotlin: `dependency-inversion-kotlin`, where the checkout receives its dependencies in its primary constructor and
  a test fake is a lambda.
