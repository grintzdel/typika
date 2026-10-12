+++
id = "wiring"
title = "One place to plug everything in"
file = "internal/app/open_shop.go"
region = "wiring"
also = ["internal/orders/service_test.go"]
+++

Something has to choose which adapter fills each port. `OpenShop` is that place: it creates the infrastructure, wraps
it in adapters, hands them to `orders.NewService`, and puts the HTTP adapter in front. The `ManualClock` goes in as it
is: it already has a `Now() time.Time` method, so it satisfies `Clock` without an adapter.

The base's `OpenShop` returned a `Shop` with the same `HTTP`, `Cards`, `Broker`, `Mailer` and `Clock`, which is why
both share their tests: from the outside, the shop behaves the same.

Open `service_test.go`. It wires the same core differently: small structs for payments, events and the clock, and a
`recordingNotifier` that keeps what it receives. The test places an order and checks the rule that shipping needs a
payment, without a request, a status code or an email. The same move gives you a CLI, a batch import or a message
consumer: another adapter, another wiring.
