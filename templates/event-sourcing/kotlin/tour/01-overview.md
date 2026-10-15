+++
id = "overview"
title = "A status that forgets"
file = "src/main/kotlin/Main.kt"
+++

Click **Run**: the shop places, pays, ships and cancels orders. The second order is cancelled because Ada "ordered
twice". Now ask the base: when was it cancelled, and why? It cannot say. `cancelOrder` sets `isCancelled = true`, puts
the reason in an email, and forgets it. Every step overwrites the row, so the history is lost the moment it happens.

Event sourcing stores what happened instead of the current state. Each change is an event, `OrderPlaced`,
`OrderPaid`, `OrderCancelled`, appended to the order's stream and never modified. The current state is computed by
replaying the stream.

You will see the events, the two functions that drive the model (`decide` and `evolve`), the append-only event store,
how an order is rebuilt from its stream, and what this costs.
