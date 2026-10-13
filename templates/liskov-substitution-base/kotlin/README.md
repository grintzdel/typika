# Liskov substitution base: shipping products

The starting point of `liskov-substitution-kotlin`. The shop sells physical products, bundles and e-books.
`PhysicalProduct` is `open` and every product extends it, so `DigitalProduct` weighs 0 g and throws when shipped, and
`checkout` checks for it with `is` before shipping anything.

The code works and its tests pass. Open `liskov-substitution-kotlin` to see the same behaviour with a hierarchy that
keeps its promises, or start the `add-gift-card` exercise there to feel why the principle exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # checks out a cart with a bundle, a mug and an e-book
gradle test
```
