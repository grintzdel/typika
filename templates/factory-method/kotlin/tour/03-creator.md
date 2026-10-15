+++
id = "creator"
title = "The creator keeps the steps"
file = "src/main/kotlin/shipping/Carrier.kt"
region = "creator"
+++

`Carrier` is the *creator*. Its `ship` method holds the steps that every carrier shares, in order: refuse an empty
order, create a parcel, take the next tracking number, build the shipment.

Look at the second step. `ship` does not know which parcel it gets: it calls `createParcel(order)`, and works with
whatever `Parcel` comes back. There is no `when` left in the shipping steps, and no carrier name.

`Carrier` is `abstract`: you cannot create one, because it does not know how to make a parcel. And `ship` is final,
as every Kotlin member is unless it says `open`: a subclass can fill in the parcel, but it cannot rewrite the steps.
Changing them, such as checking an address before shipping, happens in one place for every carrier.
