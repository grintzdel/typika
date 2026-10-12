+++
id = "trade-offs"
title = "When to keep it concrete"
+++

Every interface is a jump to make when reading. If a dependency is pure and fast, like a function that formats money,
inject nothing: import it and call it. Inversion is for what crosses a boundary (network, disk, clock, randomness) and
for what you expect to swap.

An interface with one implementation and no test that needs another is speculation. Go makes waiting cheap: since
implementations never name their interfaces, you can declare one in the consumer the day the second implementation
or the first fake shows up, without touching the provider.

Injection also makes dependencies visible. A `New` with seven parameters is not a problem the principle created; it
reveals a type doing too much.

Related concepts:

- [`dependency-inversion-ts`](typika:dependency-inversion-ts): the same inversion, with classes that `implements`.
- [`interface-segregation-go`](typika:interface-segregation-go): consumer-side interfaces, one client at a time.
- [`hexagonal-ts`](typika:hexagonal-ts): this principle applied to a whole application, with ports owned by the core.
