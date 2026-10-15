# Event sourcing: the life of an order

The shop's orders can be placed, paid, shipped, delivered and cancelled. This template shows event sourcing: instead of
overwriting a status, the shop appends what happened to each order (`OrderPlaced`, `OrderPaid`, `OrderCancelled`…) to
an append-only, versioned stream, and rebuilds the current order by replaying it. Nothing is lost, including when and
why an order was cancelled.

Compare it with its base, `naive-crud-kotlin`, where each step overwrites a boolean on the order row.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places, pays, ships and cancels orders
gradle test
```

## What to look at

- `src/main/kotlin/orders/OrderEvents.kt`: the sealed events, the only thing stored about an order.
- `src/main/kotlin/orders/Order.kt`: `decide` (command to events, with the rules) and `evolve` (state plus event to
  state), folded by `rehydrate`.
- `src/main/kotlin/orders/EventStore.kt`: the append-only store and its optimistic concurrency check.
- `src/main/kotlin/orders/OrdersHandler.kt`: load, rehydrate, decide, append.
- `src/main/kotlin/orders/CustomerHistory.kt`: a projection fed by the store.

## Variants

- TypeScript: `event-sourcing-ts`, with a union of events and `reduce` for the rehydration.
