# Fix a contract violation

A teammate changed `ProductBundle` so that the parcel accounts for the box the items are packed in. The checkout tests
still pass, but a contract test that every `Shippable` must pass now fails for bundles.

Make `ProductBundle` keep the promise of `Shippable` again, without changing the contract test. Start with
`src/catalog/product-bundle.ts` and the failing test in `tests/product-bundle.test.ts`.

Done when all tests pass.
