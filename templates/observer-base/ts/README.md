# Observer base: reacting to an order

The starting point of `observer-ts`. When a customer places an order, the shop reserves the stock, emails a
confirmation and tracks the sale. `placeOrder` does all three itself, one call after the other.

The code works and its tests pass. Open `observer-ts` to see the same behaviour with the Observer pattern, or start the
`add-loyalty-points` exercise there to feel why the pattern exists.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start
npm test
```
