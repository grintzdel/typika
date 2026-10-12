+++
id = "domain"
title = "A domain that knows nothing of HTTP"
file = "internal/orders/order.go"
region = "domain"
+++

`NewOrder` holds the same checks as the base, a valid email, at least one line, positive prices and quantities, but it
receives an `OrderRequest`, not a JSON body, and it returns an error that wraps `ErrInvalidOrder`, not a 400.

Look at the imports of `order.go`: `errors`, `fmt`, `strings`, `time` and the shop's `Money`. No `web`, no `infra`.
The rest of the file follows the same rule: `Ship`, `Deliver` and `Cancel` change the `Order` or return an error that
wraps `ErrConflict`. Which status code a conflict deserves is decided at the edge, with `errors.Is`.

Because the core is plain structs and functions, any entry point can use it, and a test can call it in one line. The
statuses are still four booleans: this template fixes where the rules live, not how the lifecycle is modelled.
