+++
id = "trade-offs"
title = "How small is too small"
+++

More interfaces mean more names to learn and more types to wire. Splitting an interface that has one client and one
implementation buys nothing: there is no one to protect from methods they do not call.

Do not split by method mechanically either. If every client that charges also refunds, `Chargeable` and `Refundable`
are one role, and two interfaces only make the wiring longer. Watch the clients: an interface is right when each of
its methods is used by everyone who depends on it.

In TypeScript, interfaces are structural, so a client can also declare the slice it needs next to itself, without
the provider knowing. Go makes that the default.

Related concepts:

- [`adapter-ts`](typika:adapter-ts): wraps a provider behind the narrow interface a client expects.
- [`hexagonal-ts`](typika:hexagonal-ts): ports are interfaces shaped by the application's needs, not by the providers.
