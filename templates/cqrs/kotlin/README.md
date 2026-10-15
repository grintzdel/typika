# CQRS: the customer order history

The shop's orders can be placed, paid, shipped, delivered and cancelled, and each customer has a history: how many
orders, how much spent, the status of the last one. This template shows CQRS, command query responsibility
segregation: commands change the order rows, each change is recorded as an event, and projections turn those events
into read models shaped for the screens that read them.

Compare it with its base, `naive-crud-kotlin`, where the history is recomputed from the order rows on every read.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places, pays, ships and cancels orders, then reads a customer's history
gradle test
```

## What to look at

- `src/main/kotlin/orders/write/`: the sealed commands and the handler that applies them to the write model.
- `src/main/kotlin/orders/OrderEvents.kt`: what the write side says happened.
- `src/main/kotlin/orders/read/`: the read models and the projections that build them.
- `src/main/kotlin/orders/OrdersHandler.kt`: commands for `POST`, read models only for `GET`.
- `src/main/kotlin/app/OpenShop.kt`: the projections the write side feeds.

## Variants

- TypeScript: `cqrs-ts`, with a union of commands that one `execute` method dispatches.
- Go: `cqrs-go`, with handlers as functions and read models in maps.
