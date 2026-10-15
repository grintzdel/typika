+++
id = "events"
title = "Events are facts, in the past tense"
file = "src/main/kotlin/orders/OrderEvents.kt"
region = "events"
+++

An event records something that happened to an order: `OrderPlaced`, `OrderPaid`, `OrderShipped`, `OrderDelivered`,
`OrderCancelled`. They are named in the past tense because they cannot be refused or undone: a cancellation is a new
event, not the deletion of `OrderPlaced`.

Each one is a `data class` under the `sealed interface OrderEvent`: immutable, compared by value, and the compiler
knows the full list. Each carries what was true at that moment. `OrderPlaced` keeps the customer and the lines.
`OrderPaid` keeps the charge to refund. `OrderCancelled` keeps the `reason` the base threw away. All of them carry
`occurredAt`.

There is no order table any more. These events are the only thing the shop writes about an order, so whatever is not
in an event is lost: designing the events is designing the storage.
