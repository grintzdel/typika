# Project cancellations into the customer history

Support reports that a customer's history still counts the money of an order they cancelled. The order itself is
cancelled, its status is right, but `totalSpentCents` never goes down.

The write side is fine. Fix the projection that builds the customer history in
`internal/orders/read/customer_order_summaries.go`. The expected behaviour is in
`internal/app/customer_history_test.go`.

Done when all tests pass.
