+++
id = "trade-offs"
title = "When the principle bends"
+++

Splitting a type into capabilities costs interfaces and checks such as `isShippable`. With one kind of product, a
single class is simpler. The principle earns its place when code is written once against a type and many subtypes
arrive later.

It is also easy to over-apply. Throwing from an override is not always a violation: if the parent's contract says
"may refuse", a child that refuses keeps the promise. The question is always what callers were told, not what the
method signature looks like.

Contract tests need care too. They must describe what callers rely on and nothing more. A contract that checks one
implementation's details rejects valid subtypes.

Related concepts:

- [`composition-over-inheritance-ts`](typika:composition-over-inheritance-ts): often the way out of a hierarchy that
  lies.
- [`interface-segregation-ts`](typika:interface-segregation-ts): the same split, seen from the side of the code that
  uses the interface.
