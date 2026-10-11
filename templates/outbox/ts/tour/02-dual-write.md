+++
id = "dual-write"
title = "Two writes, one can fail"
file = "src/infrastructure/fake-broker.ts"
+++

`FakeBroker` is the same as in the base. It can `goDown()`, and then `publish` throws.

In the base, `placeOrder` calls `this.db.orders.set(...)` and then `this.broker.publish(...)`. When the second call
throws, the first one has already happened. You cannot fix that by swapping them: publish first, and a failed save
announces an order that does not exist. Wrapping them in try/catch only hides the lost event.

This is the *dual-write* problem: a change that must reach two systems with no shared transaction. Retrying the publish
in memory does not survive a crash. The event has to be stored somewhere durable, at the same moment as the order, so
that it can be published later.
