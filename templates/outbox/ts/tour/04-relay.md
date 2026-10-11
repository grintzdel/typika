+++
id = "relay"
title = "The relay publishes, then marks"
file = "src/orders/outbox-relay.ts"
region = "relay"
also = ["tests/outbox-relay.test.ts"]
+++

`OutboxRelay` reads the entries not yet `published`, in order, publishes each one and marks it. At the first failure
it stops, so that a later entry is never published before an earlier one.

Here the relay runs after each request, and anyone can call `publishPending()`. In production it is a background loop
or a job that polls the table, or a process that tails the database log.

Look at the order of the two steps: publish, then mark. If the process stops between them, the entry is still
unpublished, and the next run publishes it again. The other order would lose messages instead. So the outbox delivers
each message **at least once**, sometimes twice, and the consumers have to cope with that.
