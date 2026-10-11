+++
id = "trade-offs"
title = "When not to use it"
+++

Adapter costs an interface, a class and a translation to maintain. For a stable library used in one place, calling it
directly is simpler. Reach for the pattern when you do not control the interface, when it leaks foreign concepts into
your code, or when you expect to replace it.

Watch two things:

- **Leaks.** If `ChargeResult` grows a `legacyCode` field "just in case", the adapter stops protecting anything.
- **Lowest common denominator.** An interface shaped after one provider can be hard to fit the next. Design it from
  what your code needs.

Decorator has the same shape, an object that holds another one, but keeps the interface and changes the behaviour.
Adapter keeps the behaviour and changes the interface.

Try it: the `switch-provider` exercise plugs in a second provider, starting from the base.

Related concepts:

- [`hexagonal-ts`](typika:hexagonal-ts): `PaymentGateway` is a port, and this class one of its adapters.
- [`decorator-ts`](typika:decorator-ts): same structure, different purpose.
