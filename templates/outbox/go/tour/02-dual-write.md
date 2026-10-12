+++
id = "dual-write"
title = "Two writes, one can fail"
file = "internal/infra/fake_broker.go"
+++

`FakeBroker` is the same as in the base. It can `GoDown()`, and then `Publish` returns an error that wraps
`ErrBrokerUnavailable`.

In the base, `placeOrder` calls `h.db.SaveOrder(order)` and then publishes. When the second call fails, the first one
has already happened. You cannot fix that by swapping them: publish first, and a failed save announces an order that
does not exist. Returning the error, as the base does, only tells the customer; the event is still lost.

This is the *dual-write* problem: a change that must reach two systems with no shared transaction. Retrying the publish
in memory does not survive a crash. The event has to be stored somewhere durable, at the same moment as the order, so
that it can be published later.
