# Isolate a failing subscriber

This morning the stock service timed out for an hour. Orders were saved, but during that hour no customer received a
confirmation email and no sale reached analytics.

Reserving the stock is one reaction to an order among others. When one subscriber fails, `OrderEvents` must still
notify every other subscriber, and hand the error to `onSubscriberError` so that someone can look at it.

Start with `src/orders/order-events.ts`. The expected behaviour is in `tests/order-events.test.ts`.

Done when all tests pass.
