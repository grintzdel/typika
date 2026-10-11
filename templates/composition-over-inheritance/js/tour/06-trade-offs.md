+++
id = "trade-offs"
title = "When inheritance is the right choice"
+++

Composition costs some wiring: every product names its parts, and reading one product means opening a few small
files. For a handful of kinds that differ in one way only, a short class chain is easier to follow.

The factory has two costs of its own in JavaScript. Every product gets its own copy of its three methods, where a
class shares them on the prototype: no problem for a catalogue, worth measuring for a million objects. And there is
no class to check against: `instanceof` cannot tell you that something is a product, only its methods can.

Inheritance stays a good choice when:

- the subclass really is a special case of its parent and keeps all its promises (see the Liskov principle);
- the variation is in one direction only, and stays that way;
- a framework or the platform asks you to extend one of its classes, like `EventTarget` or `HTMLElement`.

Watch for the warning signs: class names that combine several ideas, like `DiscountedPerishableProduct`, and code
copied between sibling classes.

Related concepts:

- [`composition-over-inheritance-ts`](typika:composition-over-inheritance-ts): the same parts, held by one class.
- [`liskov-substitution-ts`](typika:liskov-substitution-ts): when a subclass can safely replace its parent.
- [`decorator-js`](typika:decorator-js): adds behaviour by composition, one function at a time.
