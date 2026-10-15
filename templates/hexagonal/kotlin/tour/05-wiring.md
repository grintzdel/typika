+++
id = "wiring"
title = "One place to plug everything in"
file = "src/main/kotlin/app/OpenShop.kt"
region = "wiring"
also = ["src/test/kotlin/orders/OrderServiceTest.kt"]
+++

Something has to choose which adapter fills each port. `openShop` is that place: it creates the infrastructure, wraps
it in adapters, hands them to `OrderService` with named arguments, and puts the HTTP adapter in front. The
`ManualClock` does not know the core's `Clock`, and does not need to: `Clock(clock::now)` turns its method reference
into the port, an adapter in one expression.

The base's `openShop` returned a `Shop` with the same `http`, `cards`, `broker`, `mailer` and `clock`, which is why both
share their tests: from the outside, the shop behaves the same.

Open `OrderServiceTest.kt`. It wires the same core differently: lambdas for the notifier, the events and the clock,
and an object for payments. The test places an order and checks the rule that shipping needs a payment, without a
request, a status code or an email. The same move gives you a CLI, a batch import or a message consumer: another
adapter, another wiring.
