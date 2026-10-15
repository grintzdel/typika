# Observer: reacting to an order

When a customer places an order, a small shop reserves the stock, emails a confirmation and tracks the sale. This
template shows the Observer pattern: placing an order publishes an `OrderPlaced` event, and each reaction is a
subscriber that the order code does not know about. A subscriber is a `fun interface`, so each reaction is a lambda.

Compare it with its base, `observer-base-kotlin`, where `placeOrder` calls the three services itself.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places two sample orders and prints every reaction
gradle test
```

## What to look at

- `src/main/kotlin/orders/OrderEvents.kt`: the subject, with `subscribe`, `publish` and failure isolation.
- `src/main/kotlin/orders/PlaceOrder.kt`: publishes `OrderPlaced` without knowing who listens.
- `src/main/kotlin/orders/subscribers/`: one subscriber per reaction.
- `src/main/kotlin/app/OpenShop.kt`: where the subscribers are wired to the subject.

## Variants

- TypeScript: `observer-ts`, with a class for the subject and functions for the subscribers.
