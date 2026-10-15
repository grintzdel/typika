# Dependency inversion: confirming an order

When a customer places an order, the shop saves it and emails a confirmation. This template shows the dependency
inversion principle: `CheckoutService` declares the `Notifier` and `OrderRepository` it needs, receives them through
its primary constructor, and never names the SMTP mailer or the store that implement them.

Compare it with its base, `dependency-inversion-base-kotlin`, where `CheckoutService` creates both itself.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places two orders; the SMTP mailer prints what it would send
gradle test
```

## What to look at

- `src/main/kotlin/checkout/Dependencies.kt`: the abstractions, owned by the checkout.
- `src/main/kotlin/checkout/CheckoutService.kt`: receives its dependencies and names no implementation.
- `src/main/kotlin/infrastructure/`: the SMTP mailer and the store implement the checkout's interfaces.
- `src/main/kotlin/app/OpenShop.kt`: the composition root, the one place that picks the implementations.

## Variants

- TypeScript: `dependency-inversion-ts`, with classes that `implements` the checkout's interfaces.
