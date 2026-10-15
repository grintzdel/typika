+++
id = "event-store"
title = "An append-only, versioned store"
file = "src/main/kotlin/orders/EventStore.kt"
region = "event-store"
also = ["src/test/kotlin/orders/EventStoreTest.kt"]
+++

`InMemoryEventStore` keeps one stream of events per order. It has two operations: `load`, which returns the stream
and its version (the number of events), and `append`. Nothing is ever updated or deleted: a stream is a read-only
`List`, replaced by a longer one.

`append` takes the version the writer loaded. If another write landed in between, the stream has moved on, and the
append fails with a `ConcurrencyException`. Without that check, two agents working on the same order could both decide
from the same old state and append contradictory events. This is optimistic concurrency: no lock, but a stale write is
caught.

After a successful append, the store hands each new event to its subscribers. The customer history in
`CustomerHistory.kt` is such a projection, built from events like in [CQRS](typika:cqrs-kotlin).
