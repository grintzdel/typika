+++
id = "projection"
title = "The projection keeps the read model up to date"
file = "src/orders/read/customer-order-summaries.ts"
region = "projection"
also = ["src/orders/order-events.ts", "tests/customer-order-summaries.test.ts"]
+++

A projection turns events into a read model. `apply` receives each `OrderEvent` once: `OrderPlaced` adds an order to
the count and the total, `OrderCancelled` takes its total off, and any event on the customer's latest order updates
`lastStatus`.

The events in `order-events.ts` carry only what happened. `OrderCancelled` has no amount, so the projection remembers
each order's total from `OrderPlaced`. A projection may keep the private state it needs.

`customer-order-summaries.test.ts` feeds events by hand and checks the summary, without a database or a command. A new
screen, like a revenue dashboard, is a new projection over the same events: the write side does not change.
