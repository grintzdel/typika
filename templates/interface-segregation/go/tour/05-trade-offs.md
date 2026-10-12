+++
id = "trade-offs"
title = "How small is too small"
+++

More interfaces mean more names to learn. Declaring an interface that has one caller and one implementation buys
nothing: a function that takes the concrete `*CardGateway` is simpler until a second implementation, or a test fake,
shows up.

Do not split by method mechanically either. If every client that charges also refunds, give it one interface with
both methods, or combine small ones by embedding, as the standard library builds `io.ReadWriter` from `io.Reader` and
`io.Writer`. An interface is right when each of its methods is used by everyone who depends on it.

The Go proverb says it shortly: the bigger the interface, the weaker the abstraction. In TypeScript, where interfaces
are structural too, the same split is possible but not the habit.

Related concepts:

- [`interface-segregation-ts`](typika:interface-segregation-ts): the same split, with classes that `implements` each role.
- [`adapter-ts`](typika:adapter-ts): wraps a provider behind the narrow interface a client expects.
- [`hexagonal-ts`](typika:hexagonal-ts): ports are interfaces shaped by the application's needs, not by the providers.
