# Interface segregation: payment methods

The shop takes cards and bank transfers, saves cards and runs a tea club subscription. This template shows the
interface segregation principle the Go way: instead of one `PaymentGateway` with four methods, each client declares a
one-method interface next to itself, and each payment method only has the methods it can honour.

Compare it with its base, `interface-segregation-base-go`, where a bank transfer has to return an error from
`SaveCard` and `Subscribe`.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop    # runs a few payments and prints the ledger
go test ./...
```

## What to look at

- `internal/checkout/`, `internal/wallet/`, `internal/teaclub/`: each client declares the interface it calls.
- `internal/payments/`: the gateways, with no interface in sight.
- `internal/app/open_shop.go`: where each client receives its gateway.

## Variants

- TypeScript: `interface-segregation-ts`, with classes that `implements` each small interface.
