# State machine: the order lifecycle

An order goes from pending to paid, shipped and delivered, or gets cancelled on the way. This template shows a state
machine: the order has one explicit state, a discriminated union where each state carries its own data, and a single
table lists which actions are allowed from each state. A move missing from the table is refused with a typed error.

Compare it with its base, `naive-crud-ts`, where the status is four booleans and the rules are `if` statements spread
across every route.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places, pays, ships and cancels orders
npm test
```

## What to look at

- `src/orders/order-state.ts`: the states, the transition table and `transition`.
- `src/infrastructure/in-memory-database.ts`: the row stores one `state` instead of four booleans.
- `src/orders/orders-handler.ts`: routes that ask for a transition, and the payment guard.
