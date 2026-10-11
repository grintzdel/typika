+++
id = "trade-offs"
title = "When not to use it"
+++

Factory Method costs a class hierarchy: an abstract creator, a subclass per variant, and a parallel family of
products. For two carriers that rarely change, a `switch` is shorter. Reach for the pattern when an algorithm is
stable but the object it creates keeps varying.

It relies on inheritance, with its limits. A carrier can only have one parent, and every subclass depends on the
steps of `Carrier`: change them and you change every carrier at once. If carriers start to vary in more than one
way, subclasses multiply.

In TypeScript, you can often get the same result with a single, non-abstract `Carrier` that receives the factory as
a function, such as `(order: Order) => Parcel`. That is composition instead of inheritance: the Strategy pattern
applied to creation.

Related concepts:

- [`strategy-ts`](typika:strategy-ts): varies behaviour through composition, where Factory Method varies creation
  through inheritance.
- [`composition-over-inheritance-ts`](typika:composition-over-inheritance-ts): why the function version often ages
  better.
