+++
id = "rehydration"
title = "Rebuilding an order from its stream"
file = "src/orders/order.ts"
region = "rehydration"
also = ["src/orders/orders-handler.ts", "tests/order.test.ts"]
+++

`rehydrate` folds `evolve` over the stream: start from nothing, apply `OrderPlaced`, then `OrderPaid`, and so on. The
result is the current `Order`, the same state the base read from its row.

Open `orders-handler.ts` and look at `change`, the loop every write goes through: load the stream, rehydrate, decide,
append with the loaded version, and rehydrate again to answer. `getOrder` rehydrates too: reading an order means
replaying it.

Replaying is cheap for an order with five events. For streams with thousands, systems store a *snapshot* of the state
every N events and replay only what came after. You need none of that until a stream gets long.
