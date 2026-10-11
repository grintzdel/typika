# Refuse concurrent writes

Two support agents opened the same paid order. One cancelled it, the other shipped it a second later. Both writes
succeeded, and the order's stream now says it was cancelled, then shipped.

Each writer loads the stream, decides, and appends with the version it loaded. Fix `InMemoryEventStore.append` in
`src/orders/event-store.ts` so that an append made from a version that is no longer current fails with a
`ConcurrencyError` and changes nothing. The expected behaviour is in `tests/event-store.test.ts`.

Done when all tests pass.
