# Composition vs inheritance base: a product catalogue

The starting point of `composition-over-inheritance-go`. The shop sells e-books, physical products and perishable
food, some of it at a discount. Each kind of product embeds the one before:
`BasicProduct → PhysicalProduct → PerishableProduct → DiscountedPerishableProduct`, and a `Product` interface lets the
catalogue hold them all.

The code works and its tests pass. Open `composition-over-inheritance-go` to see the same behaviour built by
composition, or start the `add-gift-wrap` exercise there to feel why it matters.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop
go test ./...
```
