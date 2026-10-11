# Deduplicate deliveries

The loyalty programme listens to `OrderPlaced` and awards a point per euro. Since the shop moved to an outbox, some
customers get the points of an order twice.

The relay delivers at least once: if it stops after the broker accepted a message but before it marked the entry as
published, it publishes that entry again on the next run. That is by design. Fix `LoyaltyPoints` in
`src/loyalty/loyalty-points.ts` so that a message delivered twice is only counted once. The expected behaviour is in
`tests/loyalty-points.test.ts`.

Done when all tests pass.
