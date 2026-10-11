+++
id = "trade-offs"
title = "When not to open"
+++

An extension point is a bet that this part of the code will vary. Here the bet is safe: discounts change with every
campaign. Shipping the same bet everywhere costs you an interface, a list and a jump between files for code that
changes once a year. If you have two cases and no third in sight, a `switch` in one place is fine.

The real smell in the base was not the `switch` itself but its copy in `receiptFor`. Duplicated decisions drift apart.

Rules also hide interactions. "Black Friday does not apply to members" is a rule about two rules, and it fits nowhere
in this design. When rules start depending on each other, you need an explicit policy that combines them.

Related concepts:

- [`strategy-ts`](typika:strategy-ts): one way to implement this principle, choosing one behaviour at runtime.
- [`decorator-ts`](typika:decorator-ts): another one, adding behaviour by wrapping an object.
