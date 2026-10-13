+++
id = "trade-offs"
title = "When inheritance is the right choice"
+++

Composition costs some wiring: every product names its parts, and reading one product means opening a few small
files. For a handful of kinds that differ in one way only, a short class tree is easier to follow.

Inheritance stays a good choice when:

- the subclass really is a special case of its parent and keeps all its promises (see the Liskov principle);
- the set of kinds is closed and known: a `sealed` class lists them all, and `when` checks that you handled each one;
- a framework asks you to extend one of its classes.

Delegation with `by` has a trap of its own: the delegate does not know about the object that wraps it. If a part
calls one of its own members, it calls its own version, never the product's.

Watch for the warning signs: class names that combine several ideas, like `DiscountedPerishableProduct`, code copied
between sibling classes, and `open` added to a class only so that one more subclass can exist.

Related concepts:

- [`composition-over-inheritance-ts`](typika:composition-over-inheritance-ts): the same catalogue in TypeScript.
- [`liskov-substitution-ts`](typika:liskov-substitution-ts): when a subclass can safely replace its parent.
- [`decorator-ts`](typika:decorator-ts): adds behaviour by composition, one layer at a time.
