+++
id = "trade-offs"
title = "When embedding is the right choice"
+++

Composition costs some wiring: every product names its parts, and reading one product means opening a few small
files. For a handful of kinds that differ in one way only, a few separate types behind an interface are easier to
follow.

Embedding stays useful when you want the outer type to expose the methods of the inner one as they are: a struct that
embeds a `sync.Mutex` gets `Lock()` and `Unlock()`, a wrapper that embeds an interface only overrides the method it
changes. Use it to reuse methods, not to model "is a kind of". In Go, "is a kind of" is said with an interface.

Watch for the warning signs: type names that combine several ideas, like `DiscountedPerishableProduct`, and code
copied between sibling types.

Related concepts:

- [`composition-over-inheritance-ts`](typika:composition-over-inheritance-ts): the same catalogue with a class tree.
- [`liskov-substitution-ts`](typika:liskov-substitution-ts): when a subtype can safely replace its parent.
- [`decorator-ts`](typika:decorator-ts): adds behaviour by composition, one layer at a time.
