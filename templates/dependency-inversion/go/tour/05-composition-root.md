+++
id = "composition-root"
title = "One place to choose"
file = "internal/app/open_shop.go"
region = "composition-root"
also = ["cmd/shop/main.go"]
+++

Someone still has to create the SMTP mailer and the store. That job moves to `OpenShop`, the *composition root*: the
one place that knows every concrete type and wires them together. `main` calls it and never sees the details.

Changing email provider now means writing a new type with a `Notify` method and changing one line here. The checkout,
its tests and the rest of the shop stay as they are.

Keep the composition root at the edge of the program and keep it boring: no conditions, no business rules, only
constructors and arguments. In many Go programs it is `main` itself. When it grows, split it by package, but never
reach for it from inside the business code: a service that fetches its dependencies from a global has gone back to
choosing them itself.
