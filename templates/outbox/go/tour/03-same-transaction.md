+++
id = "same-transaction"
title = "The order and its event, in one transaction"
file = "internal/orders/handler.go"
region = "same-transaction"
also = ["internal/infra/in_memory_database.go", "internal/infra/in_memory_database_test.go"]
+++

`placeOrder` no longer talks to the broker. Inside `h.db.Transaction`, it saves the row and calls `addToOutbox`, which
writes the message to an `outbox` table in the same database. Either both are saved, or neither: `Transaction` in
`in_memory_database.go` restores the tables when the work returns an error, as a real database would roll back.

Then the handler asks the relay to publish what is pending. If the broker is down, that fails quietly: the entry waits
in the table, and the customer gets their 201.

Every write route follows the same shape, through `save`: change the row and add its event in one transaction, then
publish pending entries. Emails still go out directly; they could go through the outbox too.
