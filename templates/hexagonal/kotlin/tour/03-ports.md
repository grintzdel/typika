+++
id = "ports"
title = "Ports: what the core offers and what it needs"
file = "src/main/kotlin/orders/Ports.kt"
region = "ports"
also = ["src/main/kotlin/orders/OrderService.kt"]
+++

A port is an interface owned by the core. There are two kinds.

`OrderUseCases` is the **driving** port: what the outside world can ask the application to do. `OrderService`
implements it, and every entry point, HTTP today and a CSV import tomorrow, calls it.

`OrderRepository`, `PaymentGateway`, `Notifier`, `OrderEventPublisher` and `Clock` are the **driven** ports: what the
core needs from the outside world. They speak the domain's language: `charge` takes `Money`, `notify` takes an
`OrderNotification` that says what happened, not how to phrase an email.

The ports with one method are `fun interface`s: a lambda can implement them, which keeps fakes and small adapters
short. The packages draw the frontier: `orders.domain` and `orders` are the core, `orders.adapters` and
`infrastructure` sit outside it, and nothing in the core imports them.

Open `OrderService.kt`. `placeOrder` creates the order, saves it, publishes and notifies, through ports only. This is
the [dependency inversion principle](typika:dependency-inversion-kotlin) applied to a whole application: the core
declares the interfaces, and the infrastructure has to fit them.
