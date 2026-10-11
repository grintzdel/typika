+++
id = "trade-offs"
title = "When inheritance is the right choice"
+++

Composition costs some wiring: every product names its parts, and reading one product means opening a few small
files. For a handful of kinds that differ in one way only, a short class tree is easier to follow.

Inheritance stays a good choice when:

- the subclass really is a special case of its parent and keeps all its promises (see the Liskov principle);
- the variation is in one direction only, and stays that way;
- a framework asks you to extend one of its classes.

Watch for the warning signs: class names that combine several ideas, like `DiscountedPerishableProduct`, and code
copied between sibling classes.

Related concepts:

- [`liskov-substitution-ts`](typika:liskov-substitution-ts): when a subclass can safely replace its parent.
- [`decorator-ts`](typika:decorator-ts): adds behaviour by composition, one layer at a time.
- [`factory-method-ts`](typika:factory-method-ts): a pattern built on inheritance, and its composition alternative.
