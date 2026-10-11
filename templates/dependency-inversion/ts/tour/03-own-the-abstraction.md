+++
id = "own-the-abstraction"
title = "The checkout owns the interface"
file = "src/checkout/notifier.ts"
region = "abstraction"
also = ["src/checkout/order-repository.ts", "src/infrastructure/smtp-mailer.ts"]
+++

`Notifier` describes what the checkout needs: tell someone something. `OrderRepository` describes how it saves and
finds orders. Both live in `src/checkout/`, next to the code that uses them, and are named in the checkout's words.

That location is the *inversion*. Open `smtp-mailer.ts`: `SmtpMailer implements Notifier`, so the infrastructure now
imports from the checkout, not the other way round. Business code depends on nothing below it, and the details depend
on the business.

Owning the interface also decides its shape. The checkout asks for `notify(recipient, message)`, not for hosts, ports
or retries. If a mailer library has a richer API, it adapts to this interface, not the reverse.
