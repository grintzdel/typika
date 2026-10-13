# Liskov substitution: shipping products

The shop sells physical products, bundles and e-books. This template shows the Liskov substitution principle: a type
that stands in for another must keep all its promises. Every product is a `Product`; only the ones that can be shipped
are `Shippable`, and contract tests check that each of them keeps the promises of `Shippable`. No class is `open`: each
product implements the interfaces it keeps.

Compare it with its base, `liskov-substitution-base-kotlin`, where an e-book extends an `open` `PhysicalProduct` and
throws when shipped.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # checks out a cart with a bundle, a mug and an e-book
gradle test
```

## What to look at

- `src/main/kotlin/catalog/Product.kt`: `Product` and the two capabilities, `Shippable` and `Downloadable`.
- `src/main/kotlin/catalog/`: each product claims only the capabilities it has.
- `src/main/kotlin/checkout/Checkout.kt`: ships what is `Shippable`, links what is `Downloadable`, names no product.
- `src/test/kotlin/catalog/ShippableContract.kt`: the promises of `Shippable`, inherited by the test class of every
  shippable product.

## Variants

- TypeScript: `liskov-substitution-ts`, where the contract tests are a function that registers tests.
