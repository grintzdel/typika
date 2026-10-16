+++
id = "states"
title = "Each state carries its own data"
file = "src/main/kotlin/orders/OrderState.kt"
region = "states"
+++

`OrderState` is a sealed class: its subclasses are all declared here, and nowhere else can add one. Each holds the
data that only makes sense in that state. A `Delivered` order always has a `deliveredAt`; a `Cancelled` order always
has its `reason`; `Pending`, `Paid` and `Shipped` carry nothing, so they are `data object`s.

Kotlin smart-casts on the type. After `if (state is OrderState.Delivered)`, `state.deliveredAt` is an `Instant`, not
`Instant?`, so there is no null check to forget.

Because the hierarchy is sealed, a `when` over an `OrderState` needs no `else`: the compiler checks that every state is
handled. Add a state, and every such `when` in the code, the transition table included, stops compiling until it says
what happens in the new state.
