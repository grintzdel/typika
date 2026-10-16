# State machine: the order lifecycle

An order goes from pending to paid, shipped and delivered, or gets cancelled on the way. This template shows a state
machine: the order has one explicit state, a sealed class where each state carries its own data, and a single table
lists which actions are allowed from each state. A move missing from the table is refused with a typed exception.

Compare it with its base, `naive-crud-kotlin`, where the status is four booleans and the rules are `if` statements
spread across every route.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # places, pays, ships and cancels orders
gradle test
```

## What to look at

- `src/main/kotlin/orders/OrderState.kt`: the states, the transition table and `transition`.
- `src/main/kotlin/infrastructure/InMemoryDatabase.kt`: the row stores one `state` instead of four booleans.
- `src/main/kotlin/orders/OrdersHandler.kt`: routes that ask for a transition, and the payment guard.

## Variants

- TypeScript: `state-machine-ts`, with a discriminated union and a transition table written as a record.
