+++
id = "trade-offs"
title = "When one model is enough"
+++

The template has more moving parts than the base: commands, results, events, two read models and their projections.
The same facts are stored several times, and a bug in a projection, like forgetting `OrderCancelled`, makes a screen
wrong while the orders are right. Read models can be rebuilt, but only if you can replay what happened.

For most screens a query over the write model is fine. Reach for CQRS when reads and writes pull the model in different
directions: dashboards that aggregate across many orders, screens that are read far more often than they change, or
read shapes that keep forcing columns into the write tables.

You can also apply it to one screen only. A single projection next to an ordinary CRUD module is CQRS too.

Related concepts:

- [`event-sourcing-ts`](typika:event-sourcing-ts): stores the events themselves as the write model.
- [`outbox-ts`](typika:outbox-ts): delivers events reliably to projections in other processes.
- [`hexagonal-ts`](typika:hexagonal-ts): where commands and queries enter the core.
