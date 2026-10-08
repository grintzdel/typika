+++
id = "strategy-interface"
title = "A strategy is a function"
file = "internal/checkout/shipping_cost.go"
region = "contract"
also = ["internal/checkout/standard.go", "internal/checkout/express.go"]
+++

Every shipping option answers the same question: *how much does this order cost to ship?* In Go, that question is a
function type: `ShippingCost` takes an `Order` and returns `Money`.

There is no interface to declare and no type to implement it. `StandardShipping` and `ExpressShipping` are plain
functions with that signature, and each one carries all of its rules, including who gets free shipping. Compare them
with the base: the condition that mixed the two options is now two separate, readable checks.

This is still the Strategy pattern: a family of interchangeable algorithms behind one contract. Functions are values in
Go, so the contract is a signature rather than an interface. The TypeScript variant needs an interface and a class per
option to say the same thing.

The contract is deliberately narrow. A strategy that needs more input forces you to change every other strategy too, so
keep the question small.
