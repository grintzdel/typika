+++
id = "read-model"
title = "A read model shaped for its screen"
file = "internal/orders/read/customer_order_summaries.go"
region = "read-model"
also = ["internal/orders/handler.go"]
+++

`CustomerOrderSummary` is exactly what the history screen shows, already computed: a count, an amount, a status. It is
stored in a map per customer, so `ForCustomer` is a lookup, however many orders the shop has. A customer without
orders is not a special case: a missing key gives the zero value, which is the empty history.

Open `handler.go` and look at the `GET` routes: they read `orderViews` and `customerSummaries`, never the order rows.
`OrderViews` is a second read model, for the order detail. Each screen can have its own, denormalized without shame,
because nothing writes to it except its projection.

This is the trade the pattern makes: the same fact (Ada spent 32.50) is stored twice, in the write model and in a read
model. Duplication is the price of reads that never compute.
