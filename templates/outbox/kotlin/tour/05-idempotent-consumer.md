+++
id = "idempotent-consumer"
title = "Consumers that tolerate duplicates"
file = "src/main/kotlin/loyalty/LoyaltyPoints.kt"
region = "consumer"
also = ["src/test/kotlin/loyalty/LoyaltyPointsTest.kt"]
+++

`LoyaltyPoints` stands for another service that listens to the broker. It awards a point per euro on `OrderPlaced`.

Since a message can arrive twice, the consumer has to be *idempotent*: handling a message twice must have the same
effect as handling it once. It builds a key from what identifies the event, `OrderPlaced` and the order id, and
`handled.add(key)` does the rest: it returns `false` when the key was already in the set, and the message is ignored.

In a real service that set of keys lives in the consumer's own database, written in the same transaction as the points,
for the same reason the outbox exists. At-least-once delivery plus an idempotent consumer gives you the effect of
exactly-once, which no broker can promise on its own.
