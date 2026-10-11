+++
id = "failure-isolation"
title = "One failure stays one failure"
file = "src/orders/order-events.ts"
region = "isolation"
also = ["tests/order-events.test.ts"]
+++

Subscribers call other services, and services fail. Without care, a subscriber that throws stops the loop in
`publish`: the subscribers after it are never notified, and the error reaches `placeOrder`, which knows nothing about
the reaction that failed.

So `publish` calls each subscriber inside its own `try / catch`, and hands the error to `onSubscriberError`. The stock
service can time out; the customer still receives the confirmation email. `tests/order-events.test.ts` checks it
with a subscriber that throws on purpose.

The loop also runs over a copy of the subscribers, `[...this.subscribers]`, so a subscriber that unsubscribes while
being notified does not change the list being walked.

Try it: the `isolate-failing-subscriber` exercise removes this `try / catch`.
