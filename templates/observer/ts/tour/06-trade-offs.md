+++
id = "trade-offs"
title = "When not to use it"
+++

Observer costs a subject, an event type and an indirection: to know what happens when an order is placed, you now read
`openShop` instead of `placeOrder`. For two reactions that always run together, direct calls are easier to follow.
Reach for the pattern when reactions keep coming or come and go at runtime.

Watch three things:

- **Order.** Subscribers run in subscription order. A reaction that needs another one to run first is a hidden rule.
- **Errors.** The subject decides what a failing subscriber means. Here it is reported and ignored, so the order is
  placed even if the stock was not reserved. Make sure that is what the business wants.
- **Leaks.** A subscriber that never unsubscribes lives as long as the subject, with everything it holds.

Observer also guarantees nothing once the process stops: if it crashes after the order is saved, the email is lost.

Related concepts:

- [`outbox-ts`](typika:outbox-ts): makes the same events survive a crash or a broker outage.
- [`event-sourcing-ts`](typika:event-sourcing-ts): stores the events themselves, instead of the state they produce.
