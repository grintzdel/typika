# CQRS: the customer order history

The shop's orders can be placed, paid, shipped, delivered and cancelled, and each customer has a history: how many
orders, how much spent, the status of the last one. This template shows CQRS, command query responsibility
segregation: commands change the order rows, each change is recorded as an event, and projections turn those events
into read models shaped for the screens that read them.

Compare it with its base, `naive-crud-ts`, where the history is recomputed from the order rows on every read.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places, pays, ships and cancels orders, then reads a customer's history
npm test
```

## What to look at

- `src/orders/write/`: the commands and the handler that applies them to the write model.
- `src/orders/order-events.ts`: what the write side says happened.
- `src/orders/read/`: the read models and the projections that build them.
- `src/orders/orders-handler.ts`: commands for `POST`, read models only for `GET`.
- `src/open-shop.ts`: the projections the write side feeds.
