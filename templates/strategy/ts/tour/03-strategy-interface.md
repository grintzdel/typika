+++
id = "strategy-interface"
title = "One interface, many prices"
file = "src/checkout/shipping-cost.ts"
region = "contract"
also = ["src/checkout/options/standard.ts", "src/checkout/options/express.ts"]
+++

Every shipping option answers the same question: *how much does this order cost to ship?* `ShippingCost` is that
question, and nothing else.

Each option now has its own class. `StandardShipping` and `ExpressShipping` both implement `costFor`, and each one
carries all of its rules, including who gets free shipping. Compare them with the base: the condition that mixed the
two options is now two separate, readable checks.

This is the strategy: a family of interchangeable algorithms behind one interface. Changing express prices means
opening `express.ts`, and only that file.

The interface is deliberately narrow. It takes an `Order` and returns `Money`. A strategy that needs more input forces
you to change every other strategy too, so keep the question small.
