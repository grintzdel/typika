+++
id = "trade-offs"
title = "When not to use it"
+++

Observer costs an event and an indirection: to know what happens when an order is placed, you now read `openShop`
instead of `placeOrder`. For two reactions that always run together, direct calls are easier to follow.
Reach for the pattern when reactions keep coming or come and go at runtime.

`EventTarget` gives you the subject, not the judgement. Watch three things:

- **Order.** Listeners run in the order they were added. A reaction that must run after another is a hidden rule.
- **Errors.** The subject decides what a failing subscriber means. Here it is reported and ignored, so the order is
  placed even if the stock was not reserved. Make sure that is what the business wants.
- **Leaks.** A listener that is never removed lives as long as the target. Pass a `signal` whenever a subscription
  has an end.

Observer also guarantees nothing once the process stops: if it crashes after the order is saved, the email is lost.

Related concepts:

- [`observer-ts`](typika:observer-ts): the same subject, written by hand.
- [`outbox-ts`](typika:outbox-ts): makes the same events survive a crash or a broker outage.
