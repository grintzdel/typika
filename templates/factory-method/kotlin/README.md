# Factory Method: shipping parcels

The shop ships orders with two carriers, standard and express. Shipping always follows the same steps, but each
carrier needs its own kind of parcel. This template shows the Factory Method pattern: the abstract `Carrier` keeps the
shipping steps in a final `ship` method and leaves one of them, `createParcel`, to a subclass per carrier.

Compare it with its base, `factory-method-base-kotlin`, where `ShippingDesk.ship` builds the parcel in a `when` on the
carrier.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # ships two sample orders with every carrier
gradle test
```

## What to look at

- `src/main/kotlin/shipping/Carrier.kt`: the creator, with the shipping steps and the abstract `createParcel`.
- `src/main/kotlin/shipping/carriers/`: one concrete creator per carrier.
- `src/main/kotlin/shipping/parcels/`: the products, one `object` per kind of parcel.
- `src/main/kotlin/shipping/ShippingDesk.kt`: where a carrier is picked by name.

## Variants

- TypeScript: `factory-method-ts`, with the same abstract creator.
