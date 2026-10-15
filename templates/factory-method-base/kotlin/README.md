# Factory Method base: shipping parcels

The starting point of `factory-method-kotlin`. The shop ships orders with two carriers, standard and express. Shipping
always follows the same steps, but each carrier needs its own kind of parcel, and `ShippingDesk.ship` builds it in a
`when` on the carrier.

The code works and its tests pass. Open `factory-method-kotlin` to see the same behaviour with the Factory Method
pattern, or start the `add-locker-carrier` exercise there to feel why the pattern exists.

## Run it

Requires a JDK 17 or later and Gradle 8 or later.

```sh
gradle run     # ships two sample orders with every carrier
gradle test
```
