+++
id = "trade-offs"
title = "When a flag is just a flag"
+++

A state machine pays off when an entity has a lifecycle: several states, rules about the order they come in, and
actions that depend on where you are. Orders, payments, subscriptions, support tickets.

If the flags are independent, they are not states. `isGiftWrapped` and `isPaid` can be combined freely; forcing them
into one status would multiply the states instead. And a two-state lifecycle, such as active and archived, needs no
table.

The table is data, so it cannot hold behaviour. When each state needs its own logic, the GoF State pattern puts that
behaviour in one object per state instead; here the machine is a table and the behaviour stays in the handler.

Related concepts:

- [`event-sourcing-ts`](typika:event-sourcing-ts): its `evolve` is a state machine driven by events.
- [`open-closed-ts`](typika:open-closed-ts): new states and moves extend the table, not every route.
