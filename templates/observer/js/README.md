# Observer: reacting to an order

When a customer places an order, a small shop reserves the stock, emails a confirmation and tracks the sale. This
template shows the Observer pattern in JavaScript, where the platform already provides it: placing an order dispatches
an `order-placed` event on an `EventTarget`, and each reaction is a listener that the order code does not know about.

Compare it with its base, `observer-base-js`, where `placeOrder` calls the three services itself.

## Run it

Requires Node.js 22 or later.

```sh
npm install
npm start      # places two sample orders and prints every reaction
npm test
```

## What to look at

- `src/orders/order-events.js`: the subject, an `EventTarget` that isolates failing subscribers.
- `src/orders/place-order.js`: publishes the placed order without knowing who listens.
- `src/orders/subscribers/`: one subscriber per reaction.
- `src/open-shop.js`: where the subscribers are wired to the subject.

## Variants

- TypeScript: `observer-ts`, which writes the subject by hand.
