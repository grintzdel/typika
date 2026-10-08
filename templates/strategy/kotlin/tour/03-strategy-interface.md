+++
id = "strategy-interface"
title = "A functional interface"
file = "src/main/kotlin/checkout/ShippingCost.kt"
region = "contract"
also = ["src/main/kotlin/checkout/StandardShipping.kt", "src/main/kotlin/checkout/ExpressShipping.kt"]
+++

Every shipping option answers the same question: *how much does this order cost to ship?* `ShippingCost` is that
question, and nothing else.

`StandardShipping` and `ExpressShipping` are `object`s that implement it. They hold no state, so one instance of each
is enough. Each one carries all of its rules, including who gets free shipping. Compare them with the base: the
condition that mixed the two options is now two separate `when` expressions.

The `fun` in `fun interface` matters. An interface with a single abstract method can be implemented by a lambda, so
`ShippingCost { eur(100) }` is a complete strategy. Kotlin sits between the two other variants: a named type, as in
TypeScript, that you can write as a function, as in Go.

The interface is deliberately narrow. A strategy that needs more input forces you to change every other strategy too,
so keep the question small.
