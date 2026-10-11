# Event sourcing: the life of an order

The shop's orders can be placed, paid, shipped, delivered and cancelled. This template shows event sourcing: instead of
overwriting a status, the shop appends what happened to each order (`OrderPlaced`, `OrderPaid`, `OrderCancelled`…) to
an append-only, versioned stream, and rebuilds the current order by replaying it. Nothing is lost, including when and
why an order was cancelled.

Compare it with its base, `naive-crud-ts`, where each step overwrites a boolean on the order row.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places, pays, ships and cancels orders
npm test
```

## What to look at

- `src/orders/order-events.ts`: the events, the only thing stored about an order.
- `src/orders/order.ts`: `decide` (command to events, with the rules) and `evolve` (state plus event to state).
- `src/orders/event-store.ts`: the append-only store and its optimistic concurrency check.
- `src/orders/orders-handler.ts`: load, rehydrate, decide, append.
- `src/orders/customer-history.ts`: a projection fed by the store.
