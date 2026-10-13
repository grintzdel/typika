# Composition vs inheritance: a product catalogue

The shop sells e-books, physical products and perishable food, some of it at a discount. This template builds every
product from three small parts: how it is priced, how it is shipped and how it is packed. A product is a combination
of parts, not the last link of a chain of `open` subclasses.

Compare it with its base, `composition-over-inheritance-base-kotlin`, where each kind of product is a subclass of the
one before.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # prints the catalogue
gradle test
```

## What to look at

- `src/main/kotlin/catalog/Pricing.kt`, `Shipping.kt`, `Packaging.kt`: the parts, each with a few ready-made choices.
- `src/main/kotlin/catalog/Product.kt`: a product, which holds its parts and delegates to them with `by`.
- `src/main/kotlin/catalog/Catalog.kt`: where each product picks its parts.

## Variants

- TypeScript: `composition-over-inheritance-ts`, where the base is a tree of subclasses.
