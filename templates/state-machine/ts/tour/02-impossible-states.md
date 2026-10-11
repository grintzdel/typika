+++
id = "impossible-states"
title = "Make impossible states unrepresentable"
file = "src/infrastructure/in-memory-database.ts"
region = "row"
+++

Compare this `OrderRow` with the base's. The four booleans and the nullable `deliveredAt` are gone, replaced by one
field: `state`.

With booleans, the type allows orders that cannot exist: shipped and cancelled, delivered and not paid, delivered with
no delivery date. Every reader has to know which combinations are real, and every writer has to keep them real by
hand. A bug that sets one flag and forgets another produces an order no rule was written for.

With a single `state`, an order is in exactly one status at a time, by construction. The compiler, not the
programmer, rules out the combinations nobody meant. That is the first half of a state machine, and it costs
nothing at run time.
