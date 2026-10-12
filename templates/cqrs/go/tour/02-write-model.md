+++
id = "write-model"
title = "Commands say what to change"
file = "internal/orders/write/commands.go"
region = "commands"
also = ["internal/orders/write/command_handler.go"]
+++

A command is a request to change something, named after the business action: `PlaceOrder`, `PayOrder`,
`CancelOrder`. It is a plain struct, so the HTTP handler builds one from a request, and a CSV import or a test could
build the same one.

In Go, a command's handler is a method that takes it: `CommandHandler.PayOrder(PayOrder) error`. There is no
`Command` interface to implement and no bus that dispatches on a type. The compiler sees which handler each command
reaches.

The handlers apply the base's rules to the write model, the order rows. They return an `error`, and `PlaceOrder` also
returns the new id, never the order itself. A command changes state; reading it back is a query's job. The write
model keeps what the rules need, the booleans that decide whether an order can ship and the charge to refund, and no
longer serves any screen.
