+++
id = "failure-isolation"
title = "One failure stays one failure"
file = "src/orders/order-events.js"
region = "isolation"
also = ["tests/order-events.test.js"]
+++

Subscribers call other services, and services fail. Here the platform helps halfway. `dispatchEvent` calls every
listener even when one throws, so the subscribers after it are still notified. But the error does not come back to
you: it goes to the global error handler. A browser logs it; Node treats it as an uncaught exception and stops the
process.

So the listener that `subscribe` registers calls the subscriber inside its own `try / catch`, and hands the error to
`onSubscriberError`. The stock service can time out; the customer still receives the confirmation email, and the
error lands where someone looks. `tests/order-events.test.js` checks it with a subscriber that throws on purpose.

Try it: the `isolate-failing-subscriber` exercise removes this `try / catch`.
