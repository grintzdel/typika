# Liskov substitution: shipping products

The shop sells physical products, bundles and e-books. This template shows the Liskov substitution principle: a type
that stands in for another must keep all its promises. Every product is a `Product`; only the ones that can be shipped
are `Shippable`, and contract tests check that each of them keeps the promises of `Shippable`.

Compare it with its base, `liskov-substitution-base-ts`, where an e-book extends `PhysicalProduct` and throws when
shipped.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # checks out a cart with a bundle, a mug and an e-book
npm test
```

## What to look at

- `src/catalog/product.ts`: `Product` and the two capabilities, `Shippable` and `Downloadable`.
- `src/catalog/`: each product claims only the capabilities it has.
- `src/checkout/checkout.ts`: ships what is `Shippable`, links what is `Downloadable`, names no product.
- `tests/contracts/shippable.contract.ts`: the promises of `Shippable`, run against every shippable product.

## Variants

- Kotlin: `liskov-substitution-kotlin`, where no class is `open` and the contract tests are an abstract test class.
