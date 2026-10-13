# Composition vs inheritance base: a product catalogue

The starting point of `composition-over-inheritance-kotlin`. The shop sells e-books, physical products and perishable
food, some of it at a discount. Each kind of product is an `open` subclass of the one before:
`Product → PhysicalProduct → PerishableProduct → DiscountedPerishableProduct`.

The code works and its tests pass. Open `composition-over-inheritance-kotlin` to see the same behaviour built by
composition, or start the `add-gift-wrap` exercise there to feel why it matters.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # prints the catalogue
gradle test
```
