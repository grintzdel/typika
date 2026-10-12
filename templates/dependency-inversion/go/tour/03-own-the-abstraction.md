+++
id = "own-the-abstraction"
title = "The checkout owns the interface"
file = "internal/checkout/dependencies.go"
region = "abstraction"
also = ["internal/memstore/order_store.go", "internal/smtp/mailer.go"]
+++

`Notifier` describes what the checkout needs: tell someone something. `OrderRepository` describes how it saves and
finds orders. Both are declared in the `checkout` package, next to the code that uses them, in the checkout's words.

That location is the *inversion*. Open `order_store.go`: `memstore` now imports `checkout` for its `OrderID`, so the
arrow points from the infrastructure to the business. `checkout` imports neither `memstore` nor `smtp` anymore.

Open `mailer.go`: it did not change at all. Go interfaces are satisfied implicitly, so `smtp.Mailer` fits `Notifier`
without naming it. The interface belongs to the consumer, and the provider does not even know it exists.

Owning the interface also decides its shape. The checkout asks for `Notify(recipient, message)`, not for hosts, ports
or retries.
