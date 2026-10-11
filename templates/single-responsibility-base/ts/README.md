# Single responsibility base: placing an order

The starting point of `single-responsibility-ts`. When a customer places an order, the shop checks it, works out the
price, saves it and emails an invoice. `OrderService.placeOrder` does all of it in one method.

The code works and its tests pass. Open `single-responsibility-ts` to see the same behaviour split by reason to change,
or start the `add-pdf-invoice` exercise there to feel why the principle exists.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start
npm test
```
