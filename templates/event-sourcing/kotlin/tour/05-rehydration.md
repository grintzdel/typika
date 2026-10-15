+++
id = "rehydration"
title = "Rebuilding an order from its stream"
file = "src/main/kotlin/orders/Order.kt"
region = "rehydration"
also = ["src/main/kotlin/orders/OrdersHandler.kt", "src/test/kotlin/orders/OrderTest.kt"]
+++

`rehydrate` is one `fold`: start from `null`, apply `evolve` to `OrderPlaced`, then `OrderPaid`, and so on. The result
is the current `Order`, the same state the base read from its row. `evolve` is a `when` over the sealed events, so a
new event that `evolve` does not handle is a compile error, not a state silently left behind.

Open `OrdersHandler.kt` and look at `change`, the loop every write goes through: load the stream, rehydrate, decide,
append with the loaded version, rehydrate again, and hand the new order to the lambda that publishes, emails and
answers. `getOrder` rehydrates too: reading an order means replaying it.

Replaying is cheap for an order with five events. For streams with thousands, systems store a *snapshot* of the state
every N events and replay only what came after. You need none of that until a stream gets long.
