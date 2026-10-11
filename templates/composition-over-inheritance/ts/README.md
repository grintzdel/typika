# Composition vs inheritance: a product catalogue

The shop sells e-books, physical products and perishable food, some of it at a discount. This template builds every
product from three small parts: how it is priced, how it is shipped and how it is packed. A product is a combination
of parts, not a place in a tree of subclasses.

Compare it with its base, `composition-over-inheritance-base-ts`, where each kind of product is a subclass of the one
before.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # prints the catalogue
npm test
```

## What to look at

- `src/catalog/pricing.ts`, `shipping.ts`, `packaging.ts`: the parts, each with a few ready-made choices.
- `src/catalog/product.ts`: a product, which holds its parts and asks them.
- `src/catalog/catalog.ts`: where each product picks its parts.

## Variants

- JavaScript: `composition-over-inheritance-js`, where a factory function builds each product as a plain object.
