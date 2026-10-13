+++
id = "trade-offs"
title = "When not to split"
+++

Splitting has a price. Four files instead of one, a `PricedOrder` type to keep in sync, and a reader who now jumps
between files to follow one order. For a script that runs once, or a method nobody has changed in a year, that price
buys nothing.

The usual mistake is to split by **size** or by **verb** instead of by reason to change. A file per function, or a
`roundPrice` next to `priceOrder` in its own package, scatters one decision across many files: the next pricing change
then edits three of them. If two pieces always change together, they belong together.

A good signal to split is the one the base gave you: a new requirement that needs half of a method but not the other
half.

Related concepts:

- [`dependency-inversion-ts`](typika:dependency-inversion-ts): decides who creates the pieces once they are split.
- [`hexagonal-ts`](typika:hexagonal-ts): the same idea at the scale of an application, with the business at the centre.
