+++
id = "contract-tests"
title = "Tests every subtype must pass"
file = "src/test/kotlin/catalog/ShippableContract.kt"
region = "contract-tests"
also = ["src/test/kotlin/catalog/ProductBundleTest.kt"]
+++

An interface lists members; it says nothing about behaviour. `ship` could return a parcel to the wrong address and
still compile. The behaviour that `checkout` relies on is written here, as tests.

`ShippableContract` is a *contract test*: an abstract test class that asks for a way to make a product and checks the
promises of `Shippable` on it. Every shippable product weighs something. Its parcel weighs what it announced, because
`checkout` charges shipping from `weightInGrams` before it calls `ship()`. And the parcel goes where it was told.

Open `ProductBundleTest.kt`: the test class extends the contract and overrides `make`. It inherits the three tests,
which run for the bundle as if they were written in its file. When someone adds a `Shippable`, its test class extends
the contract, and a broken promise fails there, next to its cause, instead of in a checkout test far away.
