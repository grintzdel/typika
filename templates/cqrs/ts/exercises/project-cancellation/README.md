# Project cancellations into the customer history

Support reports that a customer's history still counts the money of an order they cancelled. The order itself is
cancelled, its status is right, but `totalSpentCents` never goes down.

The write side is fine. Fix the projection that builds the customer history in
`src/orders/read/customer-order-summaries.ts`. The expected behaviour is in `tests/customer-history.test.ts`.

Done when all tests pass.
