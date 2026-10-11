+++
id = "consistency"
title = "When is the read model up to date?"
file = "src/orders/write/order-command-handler.ts"
region = "record"
also = ["src/open-shop.ts"]
+++

`record` applies each event to every projection before the command returns. The read models are updated in the same
call, so a client that places an order and reads its history right after sees it. That is why the HTTP handler can
answer a command with the status taken from `orderViews`.

Many CQRS systems update projections asynchronously instead, from a queue, so that a slow read model does not slow the
writes. Then a read right after a write may miss it: the system is *eventually* consistent, and the UI has to live with
it. Start synchronous, and pay for asynchrony only when you need it; the
[outbox](typika:outbox-ts) shows how to deliver events reliably when you do.

CQRS does not require event sourcing. Here the write model still stores rows; the events exist only to feed the
projections.
