# Liskov substitution base: shipping products

The starting point of `liskov-substitution-ts`. The shop sells physical products, bundles and e-books. Every product
extends `PhysicalProduct`, so `DigitalProduct` weighs 0 g and throws when shipped, and `checkout` checks for it with
`instanceof` before shipping anything.

The code works and its tests pass. Open `liskov-substitution-ts` to see the same behaviour with a hierarchy that keeps
its promises, or start the `add-gift-card` exercise there to feel why the principle exists.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start
npm test
```
