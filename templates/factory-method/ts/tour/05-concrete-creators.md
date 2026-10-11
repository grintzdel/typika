+++
id = "concrete-creators"
title = "One subclass per carrier"
file = "src/shipping/carriers/express-carrier.ts"
region = "concrete"
also = ["src/shipping/carriers/standard-carrier.ts", "src/shipping/shipping-desk.ts"]
+++

Each carrier is now a *concrete creator*: a subclass of `Carrier` that implements `createParcel` and nothing else.
`ExpressCarrier` carries the express weight limit, which no longer sits in the shipping steps. `StandardCarrier` is
three lines.

`ShippingDesk` still turns a carrier name into a carrier, with a `Record<CarrierName, Carrier>`. Add a name to
`CARRIER_NAMES` and the compiler asks for its carrier there. Adding a carrier means a parcel, a subclass and one
entry in that record; `ship` stays untouched.

`tests/carrier.test.ts` shows the other side: a test subclass that creates a fake parcel is enough to test the
shipping steps, without any real carrier.

Try it: the `add-locker-carrier` exercise asks you to add a parcel locker carrier, starting from the base.
