+++
id = "write-model"
title = "Commands say what to change"
file = "src/orders/write/order-commands.ts"
region = "commands"
also = ["src/orders/write/order-command-handler.ts"]
+++

A command is a request to change something, named after the business action: `PlaceOrder`, `PayOrder`,
`CancelOrder`. It is data, so the HTTP handler builds one from a request, and a CSV import or a test could build the
same one.

`OrderCommandHandler` executes them against the write model, the order rows, with the same rules as the base. It
answers with a `CommandResult`: accepted, with the order id, or rejected, with a reason. It never returns the order
itself. A command changes state; reading it back is a query's job.

The write model keeps what the rules need: the booleans that decide whether an order can ship, the charge to refund.
It no longer has to serve any screen. The history is not computed here.
