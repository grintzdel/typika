# Factory Method: shipping parcels

The shop ships orders with two carriers, standard and express. Shipping always follows the same steps, but each
carrier needs its own kind of parcel. This template shows the Factory Method pattern: `Carrier` keeps the shipping
steps and leaves one of them, `createParcel`, to a subclass per carrier.

Compare it with its base, `factory-method-base-ts`, where `ShippingDesk.ship` builds the parcel in a `switch` on the
carrier.

## Run it

Requires Node.js 23.6 or later.

```sh
npm install
npm start      # ships two sample orders with every carrier
npm test
```

## What to look at

- `src/shipping/carrier.ts`: the creator, with the shipping steps and the abstract `createParcel`.
- `src/shipping/carriers/`: one concrete creator per carrier.
- `src/shipping/parcels/`: the products, one parcel class per carrier.
- `src/shipping/shipping-desk.ts`: where a carrier is picked by name.

## Variants

- Kotlin: `factory-method-kotlin`, where `ship` is final by default and each parcel is an `object`.
