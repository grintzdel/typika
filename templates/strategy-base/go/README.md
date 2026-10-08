# Strategy base: shipping options

The starting point of `strategy-go`. A small shop offers standard and express shipping, and `shippingCost` prices
both with one chain of `if` statements on the shipping option.

The code works and its tests pass. Open `strategy-go` to see the same behaviour with the Strategy pattern, or start the
`add-pickup-point-option` exercise there to feel why the pattern exists.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop
go test ./...
```
