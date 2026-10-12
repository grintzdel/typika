+++
id = "trade-offs"
title = "When a lost message is acceptable"
+++

The outbox adds a table, a relay to run and monitor, and a delay between the write and the message. Every consumer has
to be idempotent, and the outbox table must be cleaned once entries are published.

It needs a database with transactions that holds both the business data and the outbox. If your state lives in two
stores already, the outbox moves the problem, it does not solve it.

Use it when a lost or phantom event costs money or trust: payments, stock, anything another team acts on. For a
best-effort notification, such as a "someone viewed your profile" email, publishing after the write and logging failures
is simpler and good enough.

Related concepts:

- [`cqrs-go`](typika:cqrs-go): an outbox can feed projections in other processes.
- [`hexagonal-go`](typika:hexagonal-go): the relay and the broker are adapters behind a port.
