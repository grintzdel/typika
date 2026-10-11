# Observer: reacting to an order

When a customer places an order, a small shop reserves the stock, emails a confirmation and tracks the sale. This
template shows the Observer pattern: placing an order publishes an `OrderPlaced` event, and each reaction is a
subscriber that the order code does not know about.

Compare it with its base, `observer-base-ts`, where `placeOrder` calls the three services itself.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # places two sample orders and prints every reaction
npm test
```

## What to look at

- `src/orders/order-events.ts`: the subject, with `subscribe`, `publish` and failure isolation.
- `src/orders/place-order.ts`: publishes `OrderPlaced` without knowing who listens.
- `src/orders/subscribers/`: one subscriber per reaction.
- `src/open-shop.ts`: where the subscribers are wired to the subject.

## Variants

- JavaScript: `observer-js`, where `EventTarget` is the subject.
