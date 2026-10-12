+++
id = "ports"
title = "Ports: what the core offers and what it needs"
file = "internal/orders/ports.go"
region = "ports"
also = ["internal/orders/service.go", "internal/orders/adapters/http_orders_adapter.go"]
+++

`OrderRepository`, `PaymentGateway`, `Notifier`, `EventPublisher` and `Clock` are the **driven** ports: what the core
needs from the outside world. They live in package `orders` because that is where they are consumed, the Go rule for
interfaces. They speak the domain's language: `Charge` takes `shop.Money`, `Notify` takes a `Notification` that says
what happened, not how to phrase an email.

The **driving** port, what the outside world can ask, is `*Service` itself: `PlaceOrder`, `PayOrder`, `ShipOrder`.
Go has no `implements`, so the core does not declare an interface for its callers. Open `http_orders_adapter.go`: the
HTTP adapter declares `OrderUseCases`, the methods it calls, and `*Service` satisfies it without knowing.

This is the [dependency inversion principle](typika:dependency-inversion-go) applied to a whole application, and Go
enforces the direction: `adapters` imports `orders`, so `orders` cannot import `adapters` without an import cycle.
