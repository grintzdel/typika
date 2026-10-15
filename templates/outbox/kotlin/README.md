# Transactional outbox: publishing order events

Each step of an order publishes an event to a message broker, which other services rely on. This template shows the
transactional outbox: each event is written to an `outbox` table in the same database transaction as the order, and a
relay publishes the pending entries to the broker and marks them. A broker outage delays events; it no longer loses
them. Consumers such as the loyalty programme are idempotent, because the relay delivers at least once.

Compare it with its base, `naive-crud-kotlin`, where the shop saves the order and then publishes, and a failure
between the two loses the event.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places, pays, ships and cancels orders; the relay publishes each event
gradle test
```

## What to look at

- `src/main/kotlin/infrastructure/InMemoryDatabase.kt`: the `outbox` table and a simulated transaction.
- `src/main/kotlin/orders/OrdersHandler.kt`: each write saves the order and its event together.
- `src/main/kotlin/orders/OutboxRelay.kt`: publishes pending entries in order, then marks them.
- `src/main/kotlin/loyalty/LoyaltyPoints.kt`: a consumer that ignores duplicate deliveries.

## Variants

- TypeScript: `outbox-ts`, where the relay runs only after each request.
- Go: `outbox-go`, with a relay running in a goroutine that a `context` stops.
