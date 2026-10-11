+++
id = "trade-offs"
title = "When to keep it concrete"
+++

Every abstraction is a file to read and a jump to make. If a dependency is pure and fast, like a function that formats
money, inject nothing: import it and call it. Inversion is for what crosses a boundary (network, disk, clock,
randomness) and for what you expect to swap.

An interface with one implementation and no test that needs another is speculation. Start concrete, and introduce the
interface when the second implementation or the first fake shows up.

Constructor injection also makes dependencies visible. A constructor with seven parameters is not a problem the
principle created; it reveals a class doing too much.

Related concepts:

- [`hexagonal-ts`](typika:hexagonal-ts): this principle applied to a whole application, with ports owned by the core.
- [`adapter-ts`](typika:adapter-ts): fits a provider's API to the interface the business code owns.
