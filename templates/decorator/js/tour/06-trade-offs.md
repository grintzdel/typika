+++
id = "trade-offs"
title = "When not to use it"
+++

Decorator costs a function per behaviour and a stack to assemble. For one behaviour that always applies, an `if` in
the original function is easier to read. Reach for the pattern when behaviours combine differently from one use to
another, or when you want to reuse them across notifiers.

Watch three things:

- **Order.** The meaning of the stack depends on it, and nothing checks it. Test the assembled stack.
- **The signature.** Nothing checks that a decorator keeps it either. Here `notify` returns nothing; the day it
  returns a promise, every decorator must return what the wrapped call returns, or the caller silently loses it.
- **One call only.** A function decorator fits because a notifier does one thing. If it grew a second operation, you
  would wrap objects instead, and each decorator would have to forward the operations it does not change.

JavaScript also has a `@decorator` syntax for classes and their methods. It applies the same idea where the code is
declared, so the wrapping is fixed when the code is written. Here the stack is assembled at runtime, and each channel
chooses its own layers.

Adapter has the same shape, a function or object that wraps another one, but a different intent: it changes the
interface, where Decorator keeps it and changes the behaviour.

Related concepts:

- [`decorator-ts`](typika:decorator-ts): the same decorators, written as classes.
- [`open-closed-ts`](typika:open-closed-ts): each decorator extends the behaviour without modifying `emailNotifier`.
- [`adapter-ts`](typika:adapter-ts): same structure, different purpose.
