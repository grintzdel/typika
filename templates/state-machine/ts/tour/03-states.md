+++
id = "states"
title = "Each state carries its own data"
file = "src/orders/order-state.ts"
region = "states"
+++

`OrderState` is a discriminated union: one member per status, told apart by the `status` field. Each member holds the
data that only makes sense in that state. A `delivered` order always has a `deliveredAt`; a `cancelled` order always
has its `reason`; a `pending` order has neither.

TypeScript narrows on the discriminant. After `if (state.status === 'delivered')`, `state.deliveredAt` is a `Date`, not
`Date | null`, so there is no null check to forget.

`OrderStatus` is derived from the union, so adding a state adds a status, and every `Record<OrderStatus, …>` in the
file, the transition table included, fails to compile until the new state is handled.
