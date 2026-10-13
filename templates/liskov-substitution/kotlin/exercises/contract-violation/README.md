# Fix a contract violation

A teammate changed `ProductBundle` so that the parcel accounts for the box the items are packed in. The checkout tests
still pass, but a contract test that every `Shippable` must pass now fails for bundles.

Make `ProductBundle` keep the promise of `Shippable` again, without changing the contract test. Start with
`src/main/kotlin/catalog/ProductBundle.kt` and the failing test in `src/test/kotlin/catalog/ProductBundleTest.kt`.

Done when all tests pass.
