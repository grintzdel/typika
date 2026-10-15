+++
id = "projection"
title = "The projection keeps the read model up to date"
file = "src/main/kotlin/orders/read/CustomerOrderSummaries.kt"
region = "projection"
also = ["src/main/kotlin/orders/OrderEvents.kt", "src/test/kotlin/orders/read/CustomerOrderSummariesTest.kt"]
+++

A projection turns events into a read model. `apply` receives each `OrderEvent` once: `OrderPlaced` adds an order to
the count and the total, `OrderCancelled` takes its total off, and any event on the customer's latest order updates
`lastStatus`.

The events in `OrderEvents.kt` are data classes under a `sealed interface`, and carry only what happened.
`OrderCancelled` has no amount, so the projection remembers each order's total from `OrderPlaced`. A projection may
keep the private state it needs. `statusAfter` maps each event to a status with an exhaustive `when`: a new event
cannot be forgotten there.

`CustomerOrderSummariesTest.kt` feeds events by hand and checks the summary, without a database or a command. A new
screen, like a revenue dashboard, is a new projection over the same events: the write side does not change.
