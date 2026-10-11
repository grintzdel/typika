# Factory Method base: shipping parcels

The starting point of `factory-method-ts`. The shop ships orders with two carriers, standard and express. Shipping
always follows the same steps, but each carrier needs its own kind of parcel, and `ShippingDesk.ship` builds it in a
`switch` on the carrier.

The code works and its tests pass. Open `factory-method-ts` to see the same behaviour with the Factory Method pattern,
or start the `add-locker-carrier` exercise there to feel why the pattern exists.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start
npm test
```
