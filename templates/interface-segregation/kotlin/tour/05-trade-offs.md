+++
id = "trade-offs"
title = "How small is too small"
+++

More interfaces mean more names to learn and more types to wire. Splitting an interface that has one client and one
implementation buys nothing: there is no one to protect from methods they do not call.

Do not split by method mechanically either. If every client that charges also refunds, `Chargeable` and `Refundable`
are one role, and two interfaces only make the wiring longer. Watch the clients: an interface is right when each of
its methods is used by everyone who depends on it.

Kotlin interfaces are nominal: a class plays a role only if it lists the interface, unlike Go, where a client can
declare the slice it needs and any type with the right methods fits. A `fun interface` softens this. A class that never
heard of `Chargeable` can still play the role through a method reference: `Chargeable(gateway::charge)`.

Related concepts:

- [`interface-segregation-go`](typika:interface-segregation-go): each client declares its interface, and gateways
  satisfy it implicitly.
- [`adapter-ts`](typika:adapter-ts): wraps a provider behind the narrow interface a client expects.
- [`hexagonal-ts`](typika:hexagonal-ts): ports are interfaces shaped by the application's needs, not by the providers.
