+++
id = "domain"
title = "A domain that knows nothing of HTTP"
file = "src/orders/domain/order.ts"
region = "domain"
+++

`createOrder` holds the same checks as the base, a valid email, at least one line, whole positive prices and
quantities, but it receives an `OrderRequest`, not a request body, and it fails with an `InvalidOrderError`, not with
a 400.

Nothing in this file imports HTTP, storage, the broker or the mailer. The rest of the file follows the same rule:
`ship`, `deliver` and `cancel` take an `Order` and return a new one, or throw an `OrderConflictError`. Status codes are
not the domain's business; which status code a conflict deserves is decided at the edge.

Because the core is plain functions and data, any entry point can use it, and a test can call it in one line. The
statuses are still four booleans: this template fixes where the rules live, not how the lifecycle is modelled. See
[`state-machine-ts`](typika:state-machine-ts) for that.
