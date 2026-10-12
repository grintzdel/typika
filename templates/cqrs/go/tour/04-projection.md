+++
id = "projection"
title = "The projection keeps the read model up to date"
file = "internal/orders/read/customer_order_summaries.go"
region = "projection"
also = ["internal/orders/events/events.go", "internal/orders/read/customer_order_summaries_test.go"]
+++

A projection turns events into a read model. `Apply` receives each `events.Event` once: `OrderPlaced` adds an order to
the count and the total, `OrderCancelled` takes its total off, and any event on the customer's latest order updates
`LastStatus`.

The events in `events.go` carry only what happened. An `OrderCancelled` event has no amount, so the projection
remembers each order's total from `OrderPlaced`. A projection may keep the private state it needs.

The write side declares `Projection`, a one-method interface, and both read models satisfy it without naming it.
`customer_order_summaries_test.go` feeds events by hand and checks the summary, without a database or a command. A new
screen, like a revenue dashboard, is a new projection over the same events: the write side does not change.
