+++
id = "trade-offs"
title = "When the hexagon is too much"
+++

Count the files: the base had one class for orders, this template has a domain, ports, a service and five adapters,
and `InMemoryOrderRepository` copies every field between the `Order` and its row. That is the price of a core that
depends on nothing.

It pays off when the rules are worth protecting and the edges change: several entry points, providers you expect to
swap, rules you want to test in isolation. For a CRUD endpoint over a table, with no rule beyond "save what was sent",
the hexagon is ceremony. Write the handler, and extract a core when a second entry point shows up.

Ports also tempt you to abstract everything. `Money` formats itself and needs no port. Keep ports for what crosses a
boundary: storage, network, time, other teams' systems.

Packages show the frontier but do not enforce it: nothing stops a class in `orders` from importing `infrastructure`.
To make the compiler refuse it, split the core into its own Gradle module, which the adapters depend on.

Related concepts:

- [`dependency-inversion-kotlin`](typika:dependency-inversion-kotlin): the principle behind the ports, at the scale of a
  class.
- [`adapter-kotlin`](typika:adapter-kotlin): the pattern each driven adapter applies to a provider's API.
- [`cqrs-ts`](typika:cqrs-ts): splits the core again, between what changes orders and what reads them.
