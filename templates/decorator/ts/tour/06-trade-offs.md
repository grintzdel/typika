+++
id = "trade-offs"
title = "When not to use it"
+++

Decorator costs a class per behaviour and a stack to assemble. For one behaviour that always applies, an `if` in the
original class is easier to read. Reach for the pattern when behaviours combine differently from one use to another,
or when you want to reuse them across implementations of the same interface.

Watch three things:

- **Order.** The meaning of the stack depends on it, and no compiler checks it. Test the assembled stack.
- **Identity.** A wrapped object is not the original: `instanceof EmailNotifier` is false on the stack.
- **Wide interfaces.** A decorator must forward every method. With one method it is easy; with ten, most of the class
  is forwarding.

Adapter has the same shape, an object that holds another one, but a different intent: it changes the interface, where
Decorator keeps it and changes the behaviour.

Related concepts:

- [`open-closed-ts`](typika:open-closed-ts): each decorator extends the behaviour without modifying `EmailNotifier`.
- [`adapter-ts`](typika:adapter-ts): same structure, different purpose.
