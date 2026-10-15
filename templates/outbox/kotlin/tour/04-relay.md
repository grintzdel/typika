+++
id = "relay"
title = "The relay publishes, then marks"
file = "src/main/kotlin/orders/OutboxRelay.kt"
region = "relay"
also = ["src/test/kotlin/app/OutboxRelayTest.kt"]
+++

`OutboxRelay` reads the entries not yet `published`, in order, publishes each one and marks it. At the first failure
it stops, so that a later entry is never published before an earlier one.

Here the relay is synchronous: the handler calls `publishPending()` after each write, and `OutboxRelayTest.kt` calls
it directly to play the broker coming back. In production it is a background job that polls the table. In Kotlin that
job is usually a coroutine, which needs `kotlinx.coroutines`, outside the standard library this template sticks to.
Driving it by hand keeps the test deterministic: nothing runs unless the test says so.

Look at the order of the two steps: publish, then mark. If the process stops between them, the entry is still
unpublished, and the next run publishes it again. The other order would lose messages instead. So the outbox delivers
each message **at least once**, sometimes twice, and the consumers have to cope with that.
