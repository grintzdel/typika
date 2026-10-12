+++
id = "trade-offs"
title = "When the hexagon is too much"
+++

Count the files: the base had one handler for orders, this template has a domain, ports, a service and five
adapters, and `InMemoryOrderRepository` copies every field between the `Order` and its row. That is the price of a
core that depends on nothing.

It pays off when the rules are worth protecting and the edges change: several entry points, providers you expect to
swap, rules you want to test in isolation. For a CRUD endpoint over a table, with no rule beyond "save what was sent",
the hexagon is ceremony. Write the handler, and extract a core when a second entry point shows up.

Ports also tempt you to abstract everything. `shop.Money` formats itself and needs no port. Keep ports for what
crosses a boundary: storage, network, time, other teams' systems.

Related concepts:

- [`dependency-inversion-go`](typika:dependency-inversion-go): the principle behind the ports, at the scale of a type.
- [`adapter-go`](typika:adapter-go): the pattern each driven adapter applies to a provider's API.
- [`cqrs-go`](typika:cqrs-go): splits the core again, between what changes orders and what reads them.
