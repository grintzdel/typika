# Isolate a failing subscriber

This morning the stock service timed out for an hour. Customers still received their confirmation emails, but every
failure went straight to the global error handler, and nothing said which reaction had failed.

Reserving the stock is one reaction to an order among others. When one subscriber fails, `OrderEvents` must still
notify every other subscriber, and hand the error to `onSubscriberError` so that someone can look at it. The error
must not escape to the global error handler.

Start with `src/orders/order-events.js`. The expected behaviour is in `tests/order-events.test.js`.

Done when all tests pass.
