+++
id = "trade-offs"
title = "When the hexagon is too much"
+++

Count the files: the base had one class for orders, this template has a domain, ports, a service and five adapters.
Each adapter maps data both ways, and `InMemoryOrderRepository` copies every field between the `Order` and its row.
That is the price of a core that depends on nothing.

It pays off when the rules are worth protecting and the edges change: several entry points, providers you expect to
swap, rules you want to test in isolation. For a CRUD screen over a table, with no rule beyond "save what was typed",
the hexagon is ceremony. Write the handler, and extract a core when a second entry point shows up.

Ports also tempt you to abstract everything. A pure function that formats money needs no port. Keep ports for what
crosses a boundary: storage, network, time, other teams' systems.

Related concepts:

- [`dependency-inversion-ts`](typika:dependency-inversion-ts): the principle behind the ports, at the scale of a class.
- [`adapter-ts`](typika:adapter-ts): the pattern each driven adapter applies to a provider's API.
- [`cqrs-ts`](typika:cqrs-ts): splits the core again, between what changes orders and what reads them.
