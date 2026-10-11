+++
id = "creator"
title = "The creator keeps the steps"
file = "src/shipping/carrier.ts"
region = "creator"
+++

`Carrier` is the *creator*. Its `ship` method holds the steps that every carrier shares, in order: refuse an empty
order, create a parcel, take the next tracking number, build the shipment.

Look at the second step. `ship` does not know which parcel it gets: it asks `this.createParcel(order)`, and works
with whatever `Parcel` comes back. There is no `switch` left in the shipping steps, and no carrier name.

`Carrier` is `abstract`: you cannot create one, because it does not know how to make a parcel. It is the skeleton of
the algorithm, and it is complete except for that one decision. Changing the shipping steps, such as checking an
address before shipping, now happens in one place for every carrier.
