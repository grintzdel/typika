+++
id = "overview"
title = "One model for writing and reading"
file = "src/main/kotlin/Main.kt"
+++

Click **Run**: the shop places, pays, ships and cancels orders, then shows Ada's history: how many orders, how much she
spent, the status of her last one.

In the base, that history is computed on every request: `getCustomerOrders` scans every order row, filters by email
and sums the totals of the ones not cancelled. The row also stores `totalCents` and `customerEmail` mostly so that this
read is possible. Every new screen asks the same table, built for writes, for a different shape.

CQRS, command query responsibility segregation, splits the two. Commands change the write model and say what
happened. Read models are built from what happened, in exactly the shape a screen needs. You will see the commands,
the read model, the projection between them, what consistency you get, and what all of this costs.
