+++
id = "trade-offs"
title = "When not to use it"
+++

Decorator costs a type per behaviour and a stack to assemble. For one behaviour that always applies, an `if` in the
original type is easier to read. Reach for the pattern when behaviours combine differently from one use to another,
or across implementations of the same interface.

Watch three things:

- **Order.** The meaning of the stack depends on it, and no compiler checks it. Test the assembled stack.
- **Identity.** A type assertion `n.(*Email)` fails on the stack: the outer value is a `*Throttled`.
- **Silent forwarding.** Embedding forwards every method you do not override, including the one you forgot.

`net/http` middleware is the same pattern with functions: `func(http.Handler) http.Handler`. Adapter has the same shape, a value that holds another one, but a
different intent: it changes the interface, where Decorator keeps it.

Related concepts:

- [`decorator-ts`](typika:decorator-ts): the same stack, with classes that hold the notifier they wrap.
- [`open-closed-ts`](typika:open-closed-ts): each decorator extends the behaviour without modifying `Email`.
- [`adapter-ts`](typika:adapter-ts): same structure, different purpose.
