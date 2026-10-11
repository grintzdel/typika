# Composition vs inheritance: a product catalogue

The shop sells e-books, physical products and perishable food, some of it at a discount. This template builds every
product from three small parts: how it is priced, how it is shipped and how it is packed. A product is a plain object
returned by a factory function, not a place in a tree of subclasses.

Compare it with its base, `composition-over-inheritance-base-js`, where each kind of product is a subclass of the one
before.

## Run it

Requires Node.js 22 or later.

```sh
npm install
npm start      # prints the catalogue
npm test
```

## What to look at

- `src/catalog/pricing.js`, `shipping.js`, `packaging.js`: the parts, each with a few ready-made choices.
- `src/catalog/product.js`: `createProduct`, which keeps the parts and asks them.
- `src/catalog/catalog.js`: where each product picks its parts.

## Variants

- TypeScript: `composition-over-inheritance-ts`, where `Product` is one class that receives its parts.
