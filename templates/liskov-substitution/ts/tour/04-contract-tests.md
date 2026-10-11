+++
id = "contract-tests"
title = "Tests every subtype must pass"
file = "tests/contracts/shippable.contract.ts"
region = "contract-tests"
also = ["tests/product-bundle.test.ts"]
+++

An interface lists method names; it says nothing about behaviour. `ship` could return a parcel to the wrong address and
still type-check. The behaviour that `checkout` relies on is written here, as tests.

`behavesLikeShippable` is a *contract test*: a set of tests that receives a way to make a product and checks the
promises of `Shippable` on it. Every shippable product weighs something. Its parcel weighs what it announced, because
`checkout` charges shipping from `weightInGrams()` before it calls `ship()`. And the parcel goes where it was told.

Open `product-bundle.test.ts`: running the contract against a new type takes one line. When someone adds a
`Shippable`, its test file calls the contract, and a broken promise fails there, next to its cause, instead of in a
checkout test far away.
