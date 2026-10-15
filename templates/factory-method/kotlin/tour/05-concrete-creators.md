+++
id = "concrete-creators"
title = "One subclass per carrier"
file = "src/main/kotlin/shipping/carriers/ExpressCarrier.kt"
region = "concrete"
also = ["src/main/kotlin/shipping/carriers/StandardCarrier.kt", "src/main/kotlin/shipping/ShippingDesk.kt"]
+++

Each carrier is now a *concrete creator*: a subclass of `Carrier` that overrides `createParcel` and nothing else.
`ExpressCarrier` carries the express weight limit, which no longer sits in the shipping steps. `StandardCarrier` is
one line of body. The parcels have no state, so each one is an `object`, and an override may narrow the return type
to it.

`ShippingDesk` still turns a carrier name into a carrier, with a `when` over every `CarrierName`. Add an entry to the
enum and the compiler asks for its carrier there. Adding a carrier means a parcel, a subclass and one branch in that
`when`; `ship` stays untouched.

`CarrierTest.kt` shows the other side: a test subclass that creates a fake parcel is enough to test the shipping
steps, without any real carrier.

Try it: the `add-locker-carrier` exercise asks you to add a parcel locker carrier, starting from the base.
