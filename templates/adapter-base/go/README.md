# Adapter base: taking payments

The starting point of `adapter-go`. The shop takes payments through LegacyPay, a third-party SDK with its own
conventions: amounts in cents, currencies as ISO numeric codes, results as numeric response codes. `Checkout` and
`Cancellation` hold a `*legacypay.Client` and read its codes themselves.

The code works and its tests pass. Open `adapter-go` to see the same behaviour with the Adapter pattern, or start the
`switch-provider` exercise there to feel why the pattern exists.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop
go test ./...
```
