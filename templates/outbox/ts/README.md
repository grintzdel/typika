# Transactional outbox: publishing order events

Each step of an order publishes an event to a message broker, which other services rely on. This template shows the
transactional outbox: each event is written to an `outbox` table in the same database transaction as the order, and a
relay publishes the pending entries to the broker and marks them. A broker outage delays events; it no longer loses
them. Consumers such as the loyalty programme are idempotent, because the relay delivers at least once.

Compare it with its base, `naive-crud-ts`, where the shop saves the order and then publishes, and a failure between the
two loses the event.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places, pays, ships and cancels orders; the relay publishes each event
npm test
```

## What to look at

- `src/infrastructure/in-memory-database.ts`: the `outbox` table and a simulated transaction.
- `src/orders/orders-handler.ts`: each write saves the order and its event together.
- `src/orders/outbox-relay.ts`: publishes pending entries in order, then marks them.
- `src/loyalty/loyalty-points.ts`: a consumer that ignores duplicate deliveries.
