+++
id = "write-model"
title = "Commands say what to change"
file = "src/main/kotlin/orders/write/OrderCommands.kt"
region = "commands"
also = ["src/main/kotlin/orders/write/OrderCommandHandler.kt"]
+++

A command is a request to change something, named after the business action: `PlaceOrder`, `PayOrder`,
`CancelOrder`. It is data, so the HTTP handler builds one from a request, and a CSV import or a test could build the
same one.

`OrderCommand` is a `sealed interface`, and the commands on an existing order share a second one, `OrderChange`, which
carries the `orderId`. Open `OrderCommandHandler.kt`: `execute` is a `when` over every command, then a `when` over
every change, with no `else`. Add a `RefundOrder` command and the handler stops compiling until it handles it.

The handler applies commands to the write model, the order rows, with the same rules as the base. It answers with a
`CommandResult`: `Accepted` with the order id, or `Rejected` with a reason. It never returns the order itself. A
command changes state; reading it back is a query's job.
