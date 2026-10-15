+++
id = "trade-offs"
title = "When not to use it"
+++

Adapter costs an interface, a class and a translation to maintain. For a stable library used in one place, calling it
directly is simpler. Reach for the pattern when you do not control the interface, when it leaks foreign concepts into
your code, or when you expect to replace it.

Kotlin offers a lighter tool: an extension function. It adds a method to a class you do not own:

```kotlin
fun LegacyPayClient.charge(amount: Money, card: Card): ChargeResult =
    chargeResultOf(makePayment(amount.cents, 978, card.token))
```

It translates just as well, without a class. But it does not make `LegacyPayClient` a `PaymentGateway`: an extension
cannot add a supertype, and it is resolved at compile time from the declared type. `Checkout` would still depend on
`LegacyPayClient`, and switching provider would still mean rewriting it. Extensions suit small conversions at the
border, such as `Money` to a provider's amount; the adapter class is what lets the provider change.

Watch two things:

- **Leaks.** If `ChargeResult` grows a `legacyCode` field "just in case", the adapter stops protecting anything.
- **Lowest common denominator.** An interface shaped after one provider can be hard to fit the next. Design it from
  what your code needs.

Decorator has the same shape, an object that holds another one, but keeps the interface and changes the behaviour.
Adapter keeps the behaviour and changes the interface.

Try it: the `switch-provider` exercise plugs in a second provider, starting from the base.

Related concepts:

- [`hexagonal-ts`](typika:hexagonal-ts): `PaymentGateway` is a port, and this class one of its adapters.
- [`decorator-kotlin`](typika:decorator-kotlin): same structure, different purpose.
