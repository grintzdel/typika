+++
id = "trade-offs"
title = "When the current state is enough"
+++

Event sourcing gives you the full history for free, and any new read is a replay away. In exchange, events are
forever: renaming a field or splitting an event means versioning it and teaching `evolve` the old shape. A bug that
wrote a wrong event is fixed with a compensating event, not an update.

Queries that cut across orders ("all orders paid yesterday") cannot read streams one by one: they need projections,
which brings the [CQRS](typika:cqrs-ts) machinery with it.

Use it where the history is the business: money, audits, workflows where "how did we get here?" is a real question.
For a product catalogue or user preferences, a row and an `updatedAt` are enough.

Related concepts:

- [`cqrs-ts`](typika:cqrs-ts): read models built from events; often combined, never required.
- [`state-machine-ts`](typika:state-machine-ts): `evolve` is a state machine whose transitions are events.
- [`observer-ts`](typika:observer-ts): the store's subscribers are observers of the stream.
