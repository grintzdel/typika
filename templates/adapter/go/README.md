# Adapter: taking payments

The shop takes payments through LegacyPay, a third-party SDK with its own conventions: amounts in cents, currencies as
ISO numeric codes, results as numeric response codes. This template shows the Adapter pattern in Go: the checkout
talks to a `payments.Gateway` interface written for the shop, and `LegacyPayAdapter` translates between that interface
and the SDK.

Compare it with its base, `adapter-base-go`, where `Checkout` and `Cancellation` call the SDK directly.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # pays with a few test cards, then cancels the paid order
go test ./...
```

## What to look at

- `internal/legacypay/client.go`: the SDK, which the shop cannot change.
- `internal/payments/gateway.go`: the interface the shop wants.
- `internal/payments/legacypay_adapter.go`: the adapter, which translates calls, units and codes.
- `internal/checkout/`: the code that uses payments, which no longer knows LegacyPay.

## Variants

- TypeScript: `adapter-ts`, with a class that `implements` the gateway.
