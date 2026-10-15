+++
id = "trade-offs"
title = "When not to use it"
+++

Factory Method costs a class hierarchy: an abstract creator, a subclass per variant, and a parallel family of
products. For two carriers that rarely change, a `when` is shorter. Reach for the pattern when an algorithm is stable
but the object it creates keeps varying.

It relies on inheritance, with its limits. A carrier can only have one parent, and every subclass depends on the
steps of `Carrier`: change them and you change every carrier at once. If carriers start to vary in more than one
way, subclasses multiply.

Idiomatic Kotlin often skips the hierarchy. A single, final `Carrier` can receive the factory as a function,
`class Carrier(trackingNumbers: TrackingNumbers, private val createParcel: (Order) -> Parcel)`, and each carrier
becomes a value: `Carrier(numbers) { ExpressParcel }`. That is composition instead of inheritance: the Strategy
pattern applied to creation.

Related concepts:

- [`strategy-kotlin`](typika:strategy-kotlin): varies behaviour through composition, where Factory Method varies
  creation through inheritance.
- [`composition-over-inheritance-kotlin`](typika:composition-over-inheritance-kotlin): why the function version often
  ages better.
