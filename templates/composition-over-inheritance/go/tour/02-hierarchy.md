+++
id = "hierarchy"
title = "A family tree made of embedded structs"
+++

Before this template, each kind of product embedded the one before:

```go
type PhysicalProduct struct{ BasicProduct }                 // parcel, cardboard box
type PerishableProduct struct{ PhysicalProduct }            // refrigerated, insulated box
type DiscountedPerishableProduct struct {
	PerishableProduct
	discountPercent int
}
```

Embedding *promotes* methods: a `PerishableProduct` gets `Name()` and `Price()` from the structs inside it, and
declares its own `ShippingMethod()` to hide the inner one. `DiscountedPerishableProduct.Price()` calls
`p.PerishableProduct.Price()`, which plays the role of `super`.

It looks like inheritance, but it is not. A `PerishableProduct` is not a `PhysicalProduct`: you cannot pass one where
the other is expected, so the catalogue needs a `Product` interface to hold them all. And there is no late binding: a
method of `BasicProduct` that calls `p.Price()` always gets the basic price, never the discount.

Open **Diff from base** to see the full before and after.
