+++
id = "transitions"
title = "One table for every move"
file = "src/orders/order-state.ts"
region = "transitions"
also = ["tests/order-state.test.ts"]
+++

`TRANSITIONS` is the whole lifecycle, as data: for each status, which actions are allowed and where they lead. A
`pending` order can be paid or cancelled, a `shipped` one can only be delivered, `delivered` and `cancelled` are final.
To answer "can a shipped order be cancelled?", you read one line instead of four routes.

`transition` looks the move up. If it is missing, it throws an `InvalidTransitionError` that says which action was
refused from which status; the HTTP handler turns that error into a 409. Otherwise it builds the next state with the
data that state needs.

The routes no longer check anything about the lifecycle: they call `transition` and act on the result. Adding a status
or a move is a change in this file only.
