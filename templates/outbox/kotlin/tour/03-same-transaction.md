+++
id = "same-transaction"
title = "The order and its event, in one transaction"
file = "src/main/kotlin/orders/OrdersHandler.kt"
region = "same-transaction"
also = ["src/main/kotlin/infrastructure/InMemoryDatabase.kt", "src/test/kotlin/infrastructure/TransactionTest.kt"]
+++

`placeOrder` no longer talks to the broker. Inside `db.transaction { … }`, it saves the row and calls
`addToOutbox("OrderPlaced", …)`, which writes the message to an `outbox` table in the same database. Either both are
saved, or neither: `transaction` in `InMemoryDatabase.kt` restores the tables if the lambda throws, as a real database
would roll back. The lambda's last expression, the new row, is what `transaction` returns.

Then the handler asks the relay to publish what is pending. If the broker is down, that fails quietly: the entry waits
in the table, and the customer gets their 201.

Every write route follows the same shape: change the row and add its event in one transaction, then publish pending
entries. Emails still go out directly; they could go through the outbox too.
