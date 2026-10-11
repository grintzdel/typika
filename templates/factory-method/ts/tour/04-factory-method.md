+++
id = "factory-method"
title = "One method left open"
file = "src/shipping/carrier.ts"
region = "factory-method"
also = ["src/shipping/parcel.ts"]
+++

`createParcel` is the *factory method*: a method whose job is to create an object, declared by the creator and
implemented by its subclasses. It is `protected`, so only `Carrier` and its subclasses call it, and `abstract`, so
every subclass must implement it.

Its return type is the interface, `Parcel`, not a concrete class. That is what keeps `ship` independent of the
carriers: it only uses what every parcel has, a tracking prefix, a delivery time and a label.

The method also receives the `Order`. Creating the right object may depend on the input, and a factory method may
refuse: express shipping throws for a heavy order, before any tracking number is used.
