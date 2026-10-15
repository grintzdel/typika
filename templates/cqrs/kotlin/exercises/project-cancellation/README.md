# Project cancellations into the customer history

Support reports that a customer's history still counts the money of an order they cancelled. The order itself is
cancelled, its status is right, but `totalSpentCents` never goes down.

The write side is fine. Fix the projection that builds the customer history in
`src/main/kotlin/orders/read/CustomerOrderSummaries.kt`. The expected behaviour is in
`src/test/kotlin/app/CustomerHistoryTest.kt`.

Done when all tests pass.
