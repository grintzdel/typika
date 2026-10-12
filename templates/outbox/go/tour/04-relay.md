+++
id = "relay"
title = "The relay publishes, then marks"
file = "internal/orders/outbox_relay.go"
region = "relay"
also = ["internal/app/outbox_relay_test.go"]
+++

`PublishPending` reads the entries not yet published, in order, publishes each one and marks it. At the first failure
it stops, so that a later entry is never published before an earlier one. A mutex keeps two runs from publishing the
same entries at once.

The handler calls it after each write, and `Run` calls it in a loop: `main` starts `Run` in a goroutine, and cancelling
its `context` makes the `select` return. That is the Go shape of a background job that can be stopped cleanly, and
`outbox_relay_test.go` drives it the same way.

Look at the order of the two steps: publish, then mark. If the process stops between them, the entry is still
unpublished, and the next run publishes it again. So the outbox delivers each message **at least once**, sometimes
twice, and the consumers have to cope with that.
