# Interface segregation base: payment methods

The starting point of `interface-segregation-go`. The shop takes cards and bank transfers, saves cards and runs a tea
club subscription. Every payment method implements the same `PaymentGateway`, with `Charge`, `Refund`, `SaveCard` and
`Subscribe`, so `BankTransferGateway` returns an error from the two it cannot do.

The code works and its tests pass. Open `interface-segregation-go` to see the same behaviour with small interfaces, or
start the `add-gift-card-payment` exercise there to feel why the principle exists.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop
go test ./...
```
