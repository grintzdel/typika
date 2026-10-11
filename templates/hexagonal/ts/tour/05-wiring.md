+++
id = "wiring"
title = "One place to plug everything in"
file = "src/open-shop.ts"
region = "wiring"
also = ["tests/order-service.test.ts"]
+++

Something has to choose which adapter fills each port. `openShop` is that place: it creates the infrastructure, wraps
it in adapters, hands them to `OrderService`, and puts the HTTP adapter in front. It is the only file that knows every
piece.

The base's `openShop` returned the same `http`, `cards`, `broker`, `mailer` and `clock`, which is why both share their
tests: from the outside, the shop behaves the same.

Open `order-service.test.ts`. It wires the same core differently: plain objects for payments, events and the clock,
and an array that collects notifications. The test places an order and checks the rule that shipping needs a payment,
without a request, a status code or an email. The same move gives you a CLI, a batch import or a message consumer:
another adapter, another wiring.
