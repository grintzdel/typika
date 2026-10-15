+++
id = "decide-evolve"
title = "Decide what happens, evolve the state"
file = "src/main/kotlin/orders/Order.kt"
region = "decide"
+++

The model is two pure functions.

`decide` takes the current `Order` and a command, and returns a `Decision`: the events the command produces, or a
rejection. It holds every business rule: an order that is not paid cannot ship, a shipped order cannot be cancelled.
It changes nothing and calls nothing, so a test can call it with a hand-written state.

The rules read as tables. The commands are sealed, and each rule is a `when` over the `OrderStatus` enum with no
`else`: add a `REFUNDED` status and every rule that has not said what it means stops compiling.

`evolve`, further down, takes a state and one event and returns the next state. It holds no rule: by the time an event
exists, the decision was already made.

The card is charged before `decide` runs, by the handler, and the charge id comes in with `PayOrder`. Keeping side
effects out of `decide` is what keeps it pure.
