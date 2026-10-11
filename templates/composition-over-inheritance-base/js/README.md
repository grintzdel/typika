# Composition vs inheritance base: a product catalogue

The starting point of `composition-over-inheritance-js`. The shop sells e-books, physical products and perishable
food, some of it at a discount. Each kind of product is a subclass of the one before:
`Product → PhysicalProduct → PerishableProduct → DiscountedPerishableProduct`.

The code works and its tests pass. Open `composition-over-inheritance-js` to see the same behaviour built by
composition, or start the `add-gift-wrap` exercise there to feel why it matters.

## Run it

Requires Node.js 22 or later.

```sh
npm install
npm start
npm test
```
