+++
id = "idempotent-consumer"
title = "Consumers that tolerate duplicates"
file = "internal/loyalty/loyalty_points.go"
region = "consumer"
also = ["internal/loyalty/loyalty_points_test.go"]
+++

`LoyaltyPoints` stands for another service that listens to the broker. It awards a point per euro on `OrderPlaced`.

Since a message can arrive twice, the consumer has to be *idempotent*: handling a message twice must have the same
effect as handling it once. It builds a key from what identifies the event, `OrderPlaced` and the order id, keeps the
keys it has handled in a map, and ignores a message it has already seen.

In a real service those keys live in the consumer's own database, written in the same transaction as the points, for
the same reason the outbox exists. At-least-once delivery plus an idempotent consumer gives you the effect of
exactly-once, which no broker can promise on its own.
