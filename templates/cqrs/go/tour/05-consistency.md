+++
id = "consistency"
title = "When is the read model up to date?"
file = "internal/orders/write/command_handler.go"
region = "record"
also = ["internal/app/open_shop.go"]
+++

`record` applies each event to every projection before the command returns. The read models are updated in the same
call, so a client that places an order and reads its history right after sees it. That is why the HTTP handler can
answer a command with the status taken from `orderViews`.

Many CQRS systems update projections asynchronously instead, from a queue or a goroutine, so that a slow read model
does not slow the writes. Then a read right after a write may miss it: the system is *eventually* consistent, and the
UI has to live with it. Start synchronous, and pay for asynchrony only when you need it; the
[outbox](typika:outbox-go) shows how to deliver events reliably when you do.

CQRS does not require event sourcing. Here the write model still stores rows; the events exist only to feed the
projections.
