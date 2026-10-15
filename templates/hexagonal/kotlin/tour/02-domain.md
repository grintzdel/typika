+++
id = "domain"
title = "A domain that knows nothing of HTTP"
file = "src/main/kotlin/orders/domain/Order.kt"
region = "domain"
+++

`createOrder` holds the same checks as the base, a valid email, at least one line, positive prices and quantities, but
it receives an `OrderRequest`, not a request body, and it throws an `InvalidOrderException`, not a 400.

Look at the imports of package `orders.domain`: the shop's `Money` and `kotlin.time.Instant`. No `web`, no
`infrastructure`. The rest of the file follows the same rule: `ship`, `deliver` and `cancel` are methods of the
immutable `Order` that return a `copy`, or throw an `OrderConflictException`. Which status code a conflict deserves is
decided at the edge.

The exceptions share a `sealed class`, `OrderException`, in `OrderExceptions.kt`: the domain lists every way it can
refuse, and an adapter can handle them all.

Because the core is plain data classes and functions, any entry point can use it, and a test can call it in one line.
The statuses are still four booleans: this template fixes where the rules live, not how the lifecycle is modelled.
