+++
id = "transitions"
title = "One table for every move"
file = "src/main/kotlin/orders/OrderState.kt"
region = "transitions"
also = ["src/test/kotlin/orders/OrderStateTest.kt"]
+++

`movesFrom` is the whole lifecycle, as data: for each state, which actions are allowed and which status they lead to.
A pending order can be paid or cancelled, a shipped one can only be delivered, delivered and cancelled are final. To
answer "can a shipped order be cancelled?", you read one line instead of four routes.

`transition` looks the move up. If it is missing, it throws an `InvalidTransitionException` that says which action was
refused from which status; the HTTP handler turns that exception into a 409. Otherwise `enter` builds the next state
with the data that state needs, in a `when` over `OrderStatus` that is exhaustive too.

The routes no longer check anything about the lifecycle: they call `transition` and act on the result. Adding a status
or a move is a change in this file only.
