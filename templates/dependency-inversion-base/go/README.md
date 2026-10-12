# Dependency inversion base: confirming an order

The starting point of `dependency-inversion-go`. When a customer places an order, the checkout service saves it and
emails a confirmation. `checkout.NewService` creates its `smtp.Mailer` and its `memstore.OrderStore` itself.

The code works and its tests pass, but they cannot check the confirmation, and every run talks to the SMTP server.
Open `dependency-inversion-go` to see the same behaviour with the dependencies inverted, or start the
`test-without-smtp` exercise there to feel why the principle exists.

## Run it

Requires Go 1.24 or later.

```sh
go run ./cmd/shop
go test ./...
```
